import * as path from "#config/path";

import connect from "#db/connect";
import schema from "#db/schema";
import migrate from "#db/migrate";

path.mkdirSync(path.data(), { recursive: true });

const connection = connect(path.data("service.db"));

await connection.exec("PRAGMA journal_mode = WAL;");
await connection.exec(schema);
await migrate(connection, () => path.data(`service-role-${Date.now()}.db`));
// 서버 시작 시 퇴장 제한과 채팅 금지 횟수를 초기화합니다.
// 남은 채팅 금지 시간과 제재 이력은 유지합니다.
await connection.run(
  "UPDATE sanction SET kicked = NULL, count = 0 WHERE kicked IS NOT NULL OR count <> 0"
);

export const { get, run, all } = connection;

export default connection.db;
