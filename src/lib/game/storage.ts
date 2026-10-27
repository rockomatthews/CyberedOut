export async function avatarFile(file?: File | null): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cyberedout-assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("models");
    request.onerror = () =>
      reject(new Error("Browser model storage is unavailable."));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(
        "models",
        file === undefined ? "readonly" : "readwrite",
      );
      const store = transaction.objectStore("models");
      const operation =
        file === undefined
          ? store.get("avatar")
          : file === null
            ? store.delete("avatar")
            : store.put(file, "avatar");
      let found: File | null = null;
      operation.onsuccess = () => {
        if (file === undefined && operation.result instanceof Blob)
          found = new File([operation.result], "character.glb", {
            type: "model/gltf-binary",
          });
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(file === undefined ? found : file);
      };
      transaction.onerror = () => {
        db.close();
        reject(new Error("Could not save this model in your browser."));
      };
    };
  });
}
