export default {
  app: { title: "\u200B" },
  error: { heading: "페이지 없음", action: "홈으로" },
  offline: { heading: "오프라인", action: "다시 연결" },
  denied: { heading: "쿠키 필요", action: "다시 시도" },
  maint: { heading: "점검 중", action: "다시 확인" },
  block: { heading: "접근 거부", action: "다시 확인" },
  voice: {
    listening: "듣는 중",
    processing: "처리 중",
    permission: {
      heading: "마이크 권한 필요",
      message:
        "음성 인식을 사용하려면 " +
        "마이크 권한을 허용해 주세요.",
      confirm: "확인"
    }
  },
  search: { placeholder: "검색어 입력" },
  notification: {
    enabled: "알림",
    push: "푸시 알림",
    permission: {
      heading: "알림 권한 필요",
      message:
        "푸시 알림을 받으려면 " +
        "알림 권한을 허용해 주세요.",
      confirm: "확인"
    }
  },
  menu: {
    title: "설정",
    notification: "알림",
    data: "데이터",
    sound: "사운드",
    language: "언어",
    theme: "테마",
    storage: "저장 공간"
  },
  state: { on: "켜짐", off: "꺼짐" },
  toggle: { on: "사용 중", off: "사용 안 함" },
  sound: {
    vibration: "진동",
    master: "전체",
    media: "미디어",
    notify: "알림",
    tts: "음성",
    system: "시스템"
  },
  cookie: {
    delete: {
      heading: "쿠키 삭제",
      message: "저장된 쿠키를 삭제하시겠습니까?",
      cancel: "취소",
      confirm: "삭제"
    }
  },
  data: {
    usage: "사용량",
    cookie: "쿠키",
    data: "데이터",
    delete: {
      heading: "데이터 삭제",
      message: "저장된 데이터를 삭제하시겠습니까?",
      cancel: "취소",
      confirm: "삭제"
    }
  },
  theme: {
    system: "시스템",
    light: "라이트",
    dark: "다크",
    brightness: "밝기"
  },
  language: { system: "시스템", ko: "한국어" },
  admin: {
    heading: "알림 전송",
    title: "제목",
    body: "내용",
    image: "이미지",
    url: "이동 주소",
    send: "전송"
  },
  terms: {
    title: "이용약관",
    heading: "이용약관",
    service: {
      title: "제1조 목적",
      description:
        "이 약관은 서비스 이용에 관한 사항을 규정합니다."
    }
  },
  privacy: {
    title: "개인정보 처리방침",
    heading: "개인정보 처리방침"
  },
  setup: {
    title: "프로필 생성",
    name: "닉네임",
    namePlaceholder: "닉네임",
    nameChecking: "닉네임을 확인하고 있습니다.",
    nameAvailable: "사용 가능한 닉네임입니다.",
    nameUnavailable: "이미 사용 중인 닉네임입니다.",
    nameInvalid:
      "닉네임은 2자 이상 20자 이하로 입력해 주세요.",
    nameCheckError: "닉네임을 확인하지 못했습니다.",
    email: "이메일",
    emailPlaceholder: "이메일",
    emailAvailable: "올바른 이메일입니다.",
    emailInvalid: "올바른 이메일을 입력해 주세요.",
    next: "다음",
    avatar: "프로필 이미지",
    greeting: "안녕하세요. {name}님 🐶",
    welcome:
      "{number}번째 사용자가 되신 것을\n" +
      "진심으로 환영합니다.",
    optional:
      "확인을 눌러 바로 테스트를\n" + "시작하실 수 있어요.",
    complete: "확인",
    saveError: "프로필을 저장하지 못했습니다.",
    uploadError: "이미지를 업로드하지 못했습니다."
  },
  image: {
    title: "이미지 조절",
    select: "이미지 선택",
    camera: "카메라",
    gallery: "이미지",
    phone: "폰에서 보기",
    scan: "휴대폰 카메라로\n" + "QR 코드를 스캔하세요.",
    phoneGuide: "프로필 이미지를 선택해 주세요.",
    sent: "이미지가 전송되었습니다.",
    invalid: "사용할 수 없는 링크입니다.",
    sizeError: "이미지는 15MB 이하만 업로드할 수 있습니다.",
    uploadError: "이미지를 전송하지 못했습니다.",
    reset: "초기화",
    save: "저장",
    cancel: "취소",
    confirm: "완료"
  },
  profile: {
    uid: "UID",
    email: "EMAIL",
    userIp: "IP",
    accessIp: "IP",
    date: "DATE",
    os: "OS",
    copy: "복사",
    chatMute: "채팅 금지",
    kick: "강제 퇴장",
    block: "영구 차단",
    blockTitle: "영구 차단 사유",
    blockReason: "사유를 입력하세요",
    cancel: "취소",
    confirm: "확인",
    gift: "선물하기",
    message: "쪽지 보내기",
    whisper: "귓속말 보내기",
    hide: "채팅 안보기",
    report: "채팅 신고하기",
    active: "활동 중",
    away: "자리 비움"
  },
  chatting: {
    yesterday: "어제",
    action: {
      copyText: "텍스트 복사하기",
      saveImage: "이미지 저장하기",
      copyImage: "이미지 링크 복사",
      copyLink: "메시지 링크 복사",
      report: "신고하기"
    }
  },

  dialog: { title: "제목", confirm: "확인", cancel: "취소" }
};
