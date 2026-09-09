import sqlite3 from "sqlite3";

export default function connect(file) {
  const db = new sqlite3.Database(file);

  db.configure("busyTimeout", 5000);

  const exec = (query) =>
    new Promise((resolve, reject) => {
      db.exec(query, (error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });

  const get = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.get(query, params, (error, row) => {
        if (error) {
          return reject(error);
        }

        resolve(row);
      });
    });

  const run = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.run(query, params, function (error) {
        if (error) {
          return reject(error);
        }

        resolve({ id: this.lastID, changes: this.changes });
      });
    });

  const all = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.all(query, params, (error, rows) => {
        if (error) {
          return reject(error);
        }

        resolve(rows);
      });
    });

  return { db, exec, get, run, all };
}
