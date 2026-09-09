import * as path from "#config/path";

import connect from "#db/connect";
import schema from "#db/schema";
import migrate from "#db/migrate";

path.mkdirSync(path.data(), { recursive: true });

const connection = connect(path.data("service.db"));

await connection.exec("PRAGMA journal_mode = WAL;");
await connection.exec(schema);
await migrate(connection, () => path.data(`service-role-${Date.now()}.db`));

export const { get, run, all } = connection;

export default connection.db;
