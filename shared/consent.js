// 문서 내용이 변경되면 해당 버전도 함께 올립니다.
export const terms = "2";
export const privacy = "6";

export const valid = (value) =>
  value?.terms === terms && value?.privacy === privacy;
