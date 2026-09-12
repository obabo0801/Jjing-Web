export default {
  app: { title: "찡" },

  online: {
    open: "접속자",
    title: "접속자 ({count}명)",
    admin: "관리자",
    user: "일반",
    search: "검색",
    refresh: "새로고침",
    empty: "표시할 접속자가 없습니다.",
    error: "접속자 목록을 불러오지 못했습니다."
  },

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
      message: "음성 인식을 사용하려면 " + "마이크 권한을 허용해 주세요.",
      confirm: "확인"
    }
  },

  search: { placeholder: "검색어 입력" },

  notification: {
    enabled: "알림",
    push: "푸시 알림",
    permission: {
      heading: "알림 권한 필요",
      message: "푸시 알림을 받으려면 " + "알림 권한을 허용해 주세요.",
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
    black: "블랙",
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

  legal: { google: "Google 개인정보처리방침", email: "메일 문의:" },

  terms: {
    title: "이용약관",
    heading: "이용약관",

    purpose: {
      title: "제1조 (목적)",
      description:
        "이 약관은 서비스 이용에 필요한 기본 사항과 " +
        "이용자 및 운영자의 권리와 책임을 정합니다."
    },

    profile: {
      title: "제2조 (프로필 및 서비스 이용)",
      description:
        "① 이용자는 닉네임을 설정해 프로필을 만들 수 있습니다. " +
        "이메일과 프로필 이미지는 선택 사항이며, " +
        "닉네임과 프로필 이미지는 다른 이용자에게 " +
        "표시될 수 있습니다.\n" +
        "② 타인을 사칭하거나 다른 사람의 정보를 " +
        "허락 없이 등록해서는 안 됩니다.\n" +
        "③ 프로필 식별에는 쿠키 등 브라우저 저장정보가 " +
        "사용될 수 있습니다. 저장정보를 삭제하면 " +
        "기존 프로필을 식별하기 어려울 수 있습니다."
    },

    service: {
      title: "제3조 (서비스의 제공 및 변경)",
      description:
        "① 프로필, 채팅 등 화면에 안내된 기능을 제공합니다. " +
        "제공되는 기능과 이용 방법은 기기나 서비스 환경에 " +
        "따라 달라질 수 있습니다.\n" +
        "② 기능 개선, 점검, 보안 대응 등의 이유로 " +
        "서비스의 일부가 변경되거나 일시적으로 " +
        "중단될 수 있습니다.\n" +
        "③ 중요한 변경이나 서비스 종료가 예정된 경우에는 " +
        "가능한 범위에서 사전에 안내합니다."
    },

    conduct: {
      title: "제4조 (이용 시 지켜야 할 사항)",
      description:
        "① 타인 사칭, 괴롭힘이나 협박, 불법 정보 게시, " +
        "개인정보 무단 공개, 저작권 등 타인의 권리를 " +
        "침해하는 행위를 해서는 안 됩니다.\n" +
        "② 반복적인 광고나 도배, 서비스 방해, " +
        "권한 없는 접근이나 정보 수집, 이용 제한의 " +
        "부당한 회피를 해서는 안 됩니다.\n" +
        "③ 공개되는 내용에는 연락처나 주소 등 " +
        "불필요한 개인정보가 포함되지 않도록 " +
        "주의해 주세요."
    },

    content: {
      title: "제5조 (게시물과 권리)",
      description:
        "① 이용자가 작성하거나 등록한 내용의 권리는 " +
        "해당 권리자에게 있습니다.\n" +
        "② 게시물은 서비스 제공에 필요한 범위에서 " +
        "저장 · 전송 · 표시되거나 화면에 맞게 처리될 수 있습니다.\n" +
        "③ 법령이나 약관을 위반하거나 타인의 권리를 " +
        "침해하는 내용은 표시가 제한되거나 삭제될 수 있습니다."
    },

    notification: {
      title: "제6조 (웹 푸시 알림)",
      description:
        "① 웹 푸시 알림은 이용자가 알림 수신을 설정하고 " +
        "브라우저에서 필요한 권한을 허용한 경우 제공됩니다.\n" +
        "② 알림은 서비스 또는 브라우저 설정에서 " +
        "언제든 해제할 수 있습니다.\n" +
        "③ 네트워크 상태, 브라우저나 기기 설정 또는 " +
        "푸시 전달 서비스의 상태에 따라 알림이 지연되거나 " +
        "전달되지 않을 수 있습니다."
    },

    restriction: {
      title: "제7조 (이용 제한)",
      description:
        "① 약관을 위반하거나 서비스의 정상적인 운영을 " +
        "방해하는 경우 경고, 게시물 제한, 채팅 제한 또는 " +
        "서비스 이용 제한이 적용될 수 있습니다.\n" +
        "② 이용 제한은 위반 내용과 정도를 고려하여 적용하며, " +
        "가능한 경우 제한 사유와 이의제기 방법을 안내합니다.\n" +
        "③ 긴급한 보안 대응이나 피해 방지가 필요한 경우에는 " +
        "먼저 필요한 조치를 한 뒤 안내할 수 있습니다."
    },

    contact: {
      title: "제8조 (문의)",
      description:
        "서비스 이용에 관한 질문이나 의견, 이용 제한에 대한 " +
        "이의 또는 개인정보 관련 요청은 아래 연락처를 통해 " +
        "문의할 수 있습니다."
    },

    effective: {
      title: "부칙",
      description:
        "약관이 변경되는 경우 적용일과 주요 변경 내용을 " +
        "서비스를 통해 안내합니다."
    }
  },

  privacy: {
    title: "개인정보 처리방침",
    heading: "개인정보 처리방침",

    collect: {
      title: "제1조 (처리하는 개인정보와 이용 목적)",
      description:
        "서비스는 다음 정보를 필요한 범위에서 처리합니다.\n" +
        "① 프로필: UID, 닉네임, 선택 입력한 이메일, " +
        "프로필 이미지 및 관련 정보를 이용자 식별과 " +
        "프로필 제공에 이용합니다.\n" +
        "② 채팅: 메시지 내용, 작성자 식별정보, 작성 시각을 " +
        "메시지 전달과 표시에 이용합니다.\n" +
        "③ 접속 및 보안: IP 주소, 접속 시각, 운영체제, " +
        "브라우저, 요청 경로 · 응답 상태, 언어 정보를 " +
        "서비스 제공, 오류 확인 및 부정 이용 대응에 이용합니다.\n" +
        "④ 웹 푸시 알림: 푸시 구독 주소, 암호화 키, " +
        "등록 시각 등 알림 전달에 필요한 정보를 처리합니다.\n" +
        "⑤ 관리 기록: 이용 제한 정보, 관리자 권한 및 " +
        "관련 처리 기록을 서비스 운영과 이의제기 대응에 " +
        "이용합니다.\n" +
        "⑥ 문의: 발신 이메일과 문의 내용을 " +
        "문의 및 권리 행사 처리에 이용합니다."
    },

    method: {
      title: "제2조 (개인정보의 수집 방법)",
      description:
        "① 이용자가 직접 정보를 입력하거나 이미지를 등록할 때, " +
        "서비스에 접속하거나 기능을 이용하는 과정에서 " +
        "필요한 정보가 수집될 수 있습니다.\n" +
        "② 이메일과 프로필 이미지는 선택 사항입니다. " +
        "선택 정보를 입력하지 않아도 기본 기능을 " +
        "이용할 수 있습니다.\n" +
        "③ 웹 푸시 알림 정보는 이용자가 알림 사용을 선택하고 " +
        "브라우저에서 권한을 허용한 경우에 처리합니다."
    },

    retention: {
      title: "제3조 (개인정보의 보유 및 이용 기간)",
      description:
        "개인정보는 이용 목적에 필요한 기간 동안 보관하며, " +
        "목적이 달성되거나 더 이상 필요하지 않은 경우 " +
        "지체 없이 삭제하는 것을 원칙으로 합니다.\n" +
        "① 프로필 및 프로필 이미지: 삭제 요청 처리 또는 " +
        "서비스 종료 시까지.\n" +
        "② 웹 푸시 알림 구독 정보: 구독 해제, " +
        "구독 정보가 유효하지 않게 된 경우, 삭제 요청 처리 " +
        "또는 서비스 종료 시까지.\n" +
        "③ 이용 제한 및 관리 기록: 서비스 운영과 " +
        "이의제기 대응에 필요한 기간 동안.\n" +
        "④ 접속 기록과 알림 발송 기록: 서비스 운영, " +
        "보안 및 오류 확인에 필요한 기간 동안.\n" +
        "⑤ 문의 내용: 문의 및 관련 요청의 처리에 " +
        "필요한 기간 동안.\n" +
        "관계 법령에 따라 별도 보관이 필요한 경우에는 " +
        "해당 법령에서 정한 기간 동안 보관할 수 있습니다."
    },

    deletion: {
      title: "제4조 (개인정보의 파기)",
      description:
        "① 보유할 필요가 없어진 개인정보는 지체 없이 " +
        "삭제하는 것을 원칙으로 합니다.\n" +
        "② 전자 파일은 복구하기 어렵도록 삭제하며, " +
        "별도의 문서가 발생한 경우에는 안전한 방법으로 " +
        "폐기합니다.\n" +
        "③ 외부 서비스를 통해 처리되는 정보는 " +
        "해당 서비스의 삭제 절차가 함께 적용될 수 있습니다."
    },

    storage: {
      title: "제5조 (보관 장소와 공개 범위)",
      description:
        "① 데이터베이스와 업로드 이미지는 대한민국에 있는 " +
        "자체 서버에 보관합니다.\n" +
        "② 닉네임, 프로필 이미지, 활동 상태와 공개 채팅은 " +
        "다른 이용자에게 표시될 수 있습니다.\n" +
        "③ 이메일, IP 주소, 관리 기록 및 웹 푸시 구독 정보는 " +
        "일반 이용자에게 공개하지 않습니다.\n" +
        "④ GitHub는 소스 코드 관리에 사용하며 " +
        "사용자 개인정보 저장소로 사용하지 않습니다."
    },

    external: {
      title: "제6조 (외부 서비스 이용)",
      description:
        "① 웹 푸시 알림은 이용자가 사용하는 브라우저의 " +
        "푸시 전달 서비스를 통해 전송될 수 있습니다.\n" +
        "② 이메일 문의는 Gmail을 통해 수신·처리될 수 있습니다.\n" +
        "③ 외부 서비스를 이용하는 과정에서 해당 사업자의 " +
        "개인정보 처리 기준이 함께 적용될 수 있습니다.\n" +
        "④ 개인정보를 판매하거나 광고 또는 마케팅 목적으로 " +
        "제3자에게 제공하지 않습니다."
    },

    cookies: {
      title: "제7조 (쿠키와 기기 내 저장정보)",
      description:
        "① 서비스는 이용자 식별과 테마 · 언어 등 설정 저장을 위해 " +
        "쿠키 또는 브라우저 저장공간을 사용할 수 있습니다.\n" +
        "② 사용자 식별 쿠키의 유효기간은 발급 시점부터 " +
        "최대 1년이며 재발급 시 갱신될 수 있습니다.\n" +
        "③ 이용자는 브라우저 설정에서 쿠키를 차단하거나 " +
        "저장정보를 삭제할 수 있습니다. 이 경우 프로필 식별 등 " +
        "일부 기능의 이용이 제한될 수 있습니다.\n" +
        "④ 쿠키나 기기 내 저장정보를 삭제하는 것만으로 " +
        "서버에 저장된 개인정보가 함께 삭제되지는 않습니다."
    },

    rights: {
      title: "제8조 (이용자의 권리)",
      description:
        "① 이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, " +
        "처리정지 또는 동의 철회를 요청할 수 있습니다.\n" +
        "② 요청이 접수되면 필요한 범위에서 본인 여부를 확인하고 " +
        "관계 법령에 따라 처리합니다.\n" +
        "③ 웹 푸시 알림은 서비스 또는 브라우저 설정에서 " +
        "언제든 해제할 수 있습니다."
    },

    security: {
      title: "제9조 (개인정보의 안전한 관리)",
      description:
        "개인정보에 대한 접근은 필요한 범위로 제한하고, " +
        "서버와 관리 계정의 접근 권한, 보안 업데이트 및 " +
        "개인정보 처리 기록을 관리하여 개인정보를 " +
        "안전하게 보호하도록 노력합니다."
    },

    contact: {
      title: "제10조 (개인정보 문의)",
      description:
        "개인정보에 관한 문의, 불편 사항 또는 " +
        "열람 · 정정 · 삭제 등 권리 행사 요청은 " +
        "아래 연락처를 통해 접수할 수 있습니다."
    },

    changes: {
      title: "제11조 (개인정보 처리방침 변경)",
      description:
        "개인정보 처리방침이 변경되는 경우 적용일과 " +
        "주요 변경 내용을 서비스를 통해 안내합니다."
    }
  },

  setup: {
    title: "프로필 설정",
    review: "프로필 확인",
    name: "닉네임",
    required: "필수",
    optional: "선택",
    namePlaceholder: "닉네임",
    nameChecking: "닉네임을 확인하고 있습니다.",
    nameAvailable: "사용 가능한 닉네임입니다.",
    nameUnavailable: "이미 사용 중인 닉네임입니다.",
    nameInvalid: "닉네임은 2자 이상 20자 이하로 " + "입력해 주세요.",
    nameCheckError: "닉네임을 확인하지 못했습니다.",
    email: "이메일",
    emailPlaceholder: "이메일",
    emailAvailable: "올바른 이메일입니다.",
    emailInvalid: "올바른 이메일을 입력해 주세요.",
    consent: {
      all: "전체 동의",
      terms: "서비스 이용약관 동의 (필수)",
      privacy: "개인정보 처리방침 (필수)",
      view: "보기",
      error: "필수 항목에 모두 동의해 주세요."
    },
    next: "다음",
    avatar: "프로필 이미지",
    finish: "이 프로필로 시작할까요?",
    revise: "수정하기",
    complete: "시작하기",
    saveError: "프로필을 저장하지 못했습니다.",
    uploadError: "이미지를 업로드하지 못했습니다."
  },

  image: {
    loadError: "이미지를 불러오지 못했습니다.",
    title: "이미지 편집",
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
    rotate: "회전",
    zoom: "확대",
    clear: "삭제",
    save: "저장",
    cancel: "취소",
    confirm: "완료"
  },

  profile: {
    id: "ID",
    protect: "보호 모드",
    unprotect: "보호 해제",
    copy: "UID 복사",
    copied: "UID를 복사했습니다.",
    copyError: "UID를 복사하지 못했습니다. 전체 UID를 열어 복사해 주세요.",
    email: "이메일",

    access: "접속 정보",
    environment: "접속 환경",
    userIp: "가입 당시 IP",
    accessIp: "현재 접속 IP",
    date: "최초 가입일",
    time: "최근 접속일",
    os: "운영체제",
    browser: "브라우저",
    lang: "지역 언어",

    chatMute: "채팅 금지",
    chatHistory: "채팅 내역",
    historyText: "메시지 내용",
    reportHistory: "신고 내역",
    blockHistory: "제재 내역",
    historyEmpty: "조회된 기록이 없습니다.",
    historyError:
      "기록을 불러오지 못했습니다. 권한을 확인하거나 다시 시도해 주세요.",
    historySearch: "검색",
    historyDate: "날짜",
    historyType: "종류",
    historyAll: "전체",
    historyLoading: "기록을 불러오는 중입니다.",
    historyTime: "기록 일시",
    historyAction: "처리",
    historyReason: "사유",
    historyBlock: "차단",
    historyUnblock: "차단 해제",
    historyMute: "채팅 금지",
    historyKick: "강제 퇴장",
    historyUnkick: "강제 퇴장 해제",
    until: "제한 종료",
    around: "대화 보기",
    kick: "강제 퇴장",
    unkick: "강제 퇴장 해제",
    mute30: "30초 제한",
    mute30Info: "1회 적용",
    mute60: "60초 제한",
    mute60Info: "2회 적용",
    mute120: "120초 제한",
    mute120Info: "3회 적용",
    block: "영구 차단",
    blocked: "영구 차단됨",
    unblock: "영구 차단 해제",
    unblockReason: "차단 해제 사유",
    blockTime: "차단 일시",
    handler: "처리자",

    authority: "관리자 권한",
    memo: "메모",
    editMemo: "메모 수정",
    granted: "권한 부여일",
    activity: "활동 기록",
    none: "없음",
    counts: "채금 {mute}회 강퇴 {kick}회",

    saveError: "변경 사항을 저장하지 못했습니다.",
    blockTitle: "영구 차단 사유",
    blockReason: "차단 사유",

    cancel: "취소",
    confirm: "확인",

    gift: "선물하기",
    message: "쪽지 보내기",
    whisper: "귓속말 보내기",
    hide: "채팅 안보기",
    report: "사용자 신고하기",

    active: "활동 중",
    away: "자리 비움"
  },

  report: {
    type: "신고 유형",
    text: "메시지 내용",
    user: "사용자 신고",
    message: "메시지 신고",
    reason: "신고 사유",
    detail: "추가 설명 (최대 1000자)",
    spam: "스팸 · 광고",
    abuse: "욕설 · 괴롭힘",
    privacy: "개인정보 침해",
    other: "기타",
    send: "신고 접수",
    success: "신고가 접수되었습니다.",
    error: "신고하지 못했습니다. 대상을 확인하거나 다시 시도해 주세요.",
    inbox: "신고함",
    all: "전체 신고",
    target: "신고 대상",
    reporter: "신고자",
    time: "접수 일시",
    description: "추가 설명",
    conversation: "대화 보기"
  },

  chatting: {
    attach: {
      clipboard:
        "이미지 데이터를 읽지 못했습니다. GIF를 파일로 저장한 뒤 첨부해 주세요.",
      limit: "첨부는 메시지당 최대 10개까지 추가할 수 있습니다.",
      description: "이미지 설명",
      spoiler: "스포일러 표시",
      remove: "제거하기",
      reveal: "눌러서 이미지 보기"
    },
    send: "전송",
    voice: "음성 입력",
    tools: {
      open: "채팅 도구",
      emoji: "이모티콘",
      image: "이미지",
      draw: "그리기",
      stt: "음성 녹음 (STT)",
      tts: "음성 만들기 (TTS)",
      preview: "이미지 전송",
      unavailable: "이 브라우저에서 음성 기능을 사용할 수 없습니다."
    },
    audio: {
      preview: "음성 전송",
      record: "녹음 시작",
      stop: "녹음 마치기",
      hint: "최대 60초 동안 녹음할 수 있습니다.",
      text: "음성으로 보낼 내용을 입력하세요. (최대 500자)",
      error: "음성을 처리하지 못했습니다. 다시 시도해 주세요.",
      size: "음성은 15MB 이하만 전송할 수 있습니다.",
      message: "음성 메시지"
    },
    entered: "채팅에 입장하였습니다.",
    muteNotice: "{name}님이 채팅 금지 {count}회가 되셨습니다.",
    kickNotice: "{name}님이 강제 퇴장 되셨습니다.",
    unkickNotice: "{name}님의 강제 퇴장이 해제되었습니다.",
    unblockNotice: "{name}님의 영구 차단이 해제되었습니다.",
    countdown: "{seconds}초",
    remaining: "{time} 후 다시 채팅할 수 있습니다.",
    muteDetail: "{handler}님에 의해 {seconds}초 동안 채팅이 제한되었습니다.",
    reason: "사유: {reason}",
    handler: "관리자",
    kickTitle: "강제 퇴장되었습니다.",
    blockTitle: "이용이 제한되었습니다.",
    kickDetail: "{handler}님에 의해 현재 채팅에서 퇴장 처리되었습니다.",
    blockDetail: "{handler}님에 의해 서비스 이용이 제한되었습니다.",
    muted: "채팅 금지 중입니다. 제한 시간이 지나면 다시 입력할 수 있습니다.",
    previous: "이전 메시지",
    next: "이후 메시지",
    latest: "최근 대화",
    date: "날짜별 조회",
    retry: "다시 불러오기",
    emoji: {
      emoji: "이모지",
      gif: "GIF",
      sticker: "스티커",
      kaomoji: "카오모지",
      empty: "표시할 항목이 없습니다.",
      retry: "다시 시도",
      failed: "항목을 불러올 수 없습니다.",
      removeRecent: "최근 사용 기록을 모두 삭제할까요?",
      category: {
        face: "얼굴",
        people: "사람",
        animal: "동물",
        food: "음식",
        activity: "활동",
        object: "사물",
        symbol: "기호",
        flag: "깃발",
        joy: "기쁨",
        love: "사랑",
        sad: "슬픔",
        angry: "화남",
        surprise: "놀람",
        trending: "추천",
        reaction: "반응",
        laugh: "웃음",
        celebration: "축하",
        character: "캐릭터"
      },
      recent: "최근",
      ogq: "OGQ",
      basic: "이모티콘",
      clear: "내용 지우기",
      unavailable: "일부 이모티콘 목록을 갱신하지 못했습니다."
    },
    loadFailed: "대화를 불러오지 못했습니다. 다시 시도해 주세요.",
    unavailable: "이 메시지를 조회할 수 없습니다.",
    sendFailed:
      "메시지를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
    tooLong: "메시지는 2,000자까지 입력할 수 있습니다.",
    rate: "메시지를 너무 자주 보냈습니다. 잠시 후 다시 시도해 주세요.",
    copied: "메시지 링크를 복사했습니다.",
    copyFailed: "메시지 링크를 복사하지 못했습니다.",
    removeTitle: "메시지를 삭제할까요?",
    removeSuccess: "메시지를 삭제했습니다.",
    removeFailed: "메시지를 삭제하지 못했습니다.",
    yesterday: "어제",
    action: {
      copyText: "텍스트 복사하기",
      saveImage: "이미지 저장하기",
      copyImage: "이미지 링크 복사",
      copyLink: "메시지 링크 복사",
      remove: "메시지 삭제하기",
      report: "메시지 신고하기"
    }
  },

  dialog: { title: "제목", confirm: "확인", cancel: "취소" }
};
