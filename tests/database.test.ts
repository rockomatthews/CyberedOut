import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Postgres schema: RLS, private money, exclusive claims, replay prevention, live-only receipts, and refunds", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);",
    );
    const schema = (
      await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(schema);
    const user = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users(id) values($1)", [user]);
    const agent = (
      await db.query<{ id: string }>(
        "insert into agents(public_key,name,skill,mission) values('key-a','Builder','Accessible websites','Help local shops sell things') returning id",
      )
    ).rows[0].id;
    const second = (
      await db.query<{ id: string }>(
        "insert into agents(public_key,name,skill,mission) values('key-b','Helper','Editing','Help authors ship books') returning id",
      )
    ).rows[0].id;
    const job = (
      await db.query<{ id: string }>(
        "insert into jobs(client_id,title,description,acceptance,budget_cents) values($1,'Make a site','A three-page shop site','Pass accessibility checks',10000) returning id",
        [user],
      )
    ).rows[0].id;
    const firstClaim = await db.query("select * from claim_job($1,$2)", [
      job,
      agent,
    ]);
    const secondClaim = await db.query("select * from claim_job($1,$2)", [
      job,
      second,
    ]);
    assert.equal(firstClaim.rows.length, 1);
    assert.equal(secondClaim.rows.length, 0);
    await db.query(
      "insert into request_nonces values('key-a','nonce-one',now()+interval '1 minute')",
    );
    await assert.rejects(
      db.query(
        "insert into request_nonces values('key-a','nonce-one',now()+interval '1 minute')",
      ),
    );
    assert.equal(
      (
        await db.query<{ consume_rate_limit: boolean }>(
          "select consume_rate_limit('ip-a',1)",
        )
      ).rows[0].consume_rate_limit,
      true,
    );
    assert.equal(
      (
        await db.query<{ consume_rate_limit: boolean }>(
          "select consume_rate_limit('ip-a',1)",
        )
      ).rows[0].consume_rate_limit,
      false,
    );
    const connection = (
      await db.query<{ id: string }>(
        "insert into connections(owner_id,agent_id,provider,provider_account,scope,livemode) values($1,$2,'stripe','acct_fixture','read_write',true) returning id",
        [user, agent],
      )
    ).rows[0].id;
    const link = (
      await db.query<{ id: string }>(
        "insert into payment_links(job_id,agent_id,owner_id,connection_id,session_id,amount_cents,currency) values($1,$2,$3,$4,'cs_fixture',10000,'USD') returning id",
        [job, agent, user, connection],
      )
    ).rows[0].id;
    await db.query(
      "insert into payment_receipts(payment_link_id,provider_charge_id,gross_cents,refunds_cents,fees_cents,currency,livemode) values($1,'ch_live',10000,2000,320,'USD',true),($1,'ch_test',99999999,0,0,'USD',false)",
      [link],
    );
    const totals = (
      await db.query<{
        gross_cents: number;
        refunds_cents: number;
        received_less_refunds_cents: number;
      }>("select * from revenue_totals")
    ).rows[0];
    assert.equal(Number(totals.gross_cents), 10000);
    assert.equal(Number(totals.refunds_cents), 2000);
    assert.equal(Number(totals.received_less_refunds_cents), 8000);
    await db.query(
      "update payment_receipts set refunds_cents=5000 where provider_charge_id='ch_live'",
    );
    assert.equal(
      Number(
        (
          await db.query<{ received_less_refunds_cents: number }>(
            "select * from revenue_totals",
          )
        ).rows[0].received_less_refunds_cents,
      ),
      5000,
    );
    await assert.rejects(
      db.query(
        "insert into payment_receipts(payment_link_id,provider_charge_id,gross_cents,currency,livemode) values($1,'ch_live',10000,'USD',true)",
        [link],
      ),
    );
    const rls = (
      await db.query<{ n: number }>(
        "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity",
      )
    ).rows[0].n;
    assert.equal(rls, 11);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from connections"));
    await assert.rejects(db.query("select * from bank_transactions"));
    await assert.rejects(
      db.query(
        "insert into agents(public_key,name,skill,mission) values('evil','Bad','Fake skill','Fake mission')",
      ),
    );
    await assert.rejects(
      db.query("select * from claim_job($1,$2)", [job, second]),
    );
    await db.exec("reset role;set role authenticated");
    await assert.rejects(db.query("select * from agents"));
    await assert.rejects(db.query("select * from payment_receipts"));
  } finally {
    await db.close();
  }
});
