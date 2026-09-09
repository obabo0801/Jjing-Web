import assert from "node:assert/strict";

export const state = {
  calls: [],
  results: new Map(),
  rows: new Map(),
  deleted: [],
  records: [],
  error: null
};

export const applicationDefault = () => "test-credential";
export const initializeApp = (options) => options;
export const getMessaging = () => ({
  async sendEachForMulticast(request) {
    state.calls.push(request);
    if (state.error) throw state.error;
    return {
      responses: request.fids.map(
        (fid) =>
          state.results.get(fid) ?? {
            success: true,
            messageId: `message:${fid}`
          }
      )
    };
  }
});

// 운영 DB 모듈을 로드하지 않고 라우터의 FID별 삭제만 검증합니다.
export const all = async (sql) => {
  assert.match(sql, /FROM fcm/);
  return [...state.rows.values()];
};
export const run = async (sql, values) => {
  assert.equal(sql, "DELETE FROM fcm WHERE fid = ?");
  assert.equal(values.length, 1);
  state.deleted.push(values[0]);
  state.rows.delete(values[0]);
};
export const admin = (req, res, next) => {
  req.user = { uid: "test-admin" };
  next();
};
export const record = async (...values) => {
  state.records.push(values);
};
export const unused = () => {
  throw new Error("외부 서비스 호출 금지");
};
