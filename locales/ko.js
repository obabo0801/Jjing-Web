export default {
  assets: {
    title: "모아보기",
    image: "이미지",
    file: "파일",
    link: "링크",
    summary: "{count}개 / {size}",
    megabytes: "{size}MB",
    unknown: "확인할 수 없음",
    empty: "표시할 항목이 없습니다.",
    error: "항목을 불러올 수 없습니다."
  },
  app: { title: "찡" },

  login: {
    title: "로그인",
    google: "Google로 로그인",
    logout: "로그아웃",
    error: "로그인 상태를 변경하지 못했습니다. 다시 시도해 주세요.",
    unavailable: "Google 로그인을 준비 중입니다. 익명으로 이용해 주세요."
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
    historyTime: "처리 일시",
    sentTime: "전송 일시",
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
    message: "메신저 보내기",
    whisper: "귓속말 보내기",
    hide: "채팅 안보기",
    report: "사용자 신고하기",
    active: "활동 중",
    away: "자리 비움",
    own: "내 프로필",
    account: "계정",
    delete: "계정 삭제",
    deleteInfo:
      "계정 삭제를 요청할까요? 모든 기기에서 로그아웃되며, 7일 후 Google 연결과 프로필 정보가 삭제됩니다. 그 전에 같은 Google 계정으로 로그인해 삭제를 취소할 수 있습니다.",
    deleteError: "계정을 삭제하지 못했습니다. 다시 시도해 주세요.",
    deletion: "계정 삭제 대기",
    deletionInfo:
      "계정이 아래 날짜에 삭제될 예정입니다. 삭제를 취소하면 계정을 계속 사용할 수 있습니다.",
    restore: "삭제 취소",
    restoreError:
      "삭제를 취소하지 못했습니다. 삭제 예정일을 확인하고 Google로 다시 로그인해 주세요.",
    anonymous: "익명 {id}",
    verified: "Google 계정 연결됨",
    nameLimit:
      "닉네임은 24시간에 한 번 변경할 수 있습니다. 이미지는 언제든 변경할 수 있습니다."
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

  history: { handling: "처리 정보" },

  room: {
    participants: "참여자",
    start: "새 대화",
    invite: "초대",
    owner: "방장",
    deputy: "부반장",
    delegate: "부반장 위임",
    revoke: "부반장 위임 해제",
    deputyConfirm: "이 참여자에게 부반장을 위임할까요?",
    revokeConfirm: "이 참여자의 부반장 위임을 해제할까요?",
    remove: "내보내기",
    transfer: "방장 위임",
    end: "대화 종료",
    name: "방 이름 변경",
    search: "이름 또는 공개 ID로 검색",
    empty: "표시할 사용자가 없습니다.",
    group: "그룹 대화",
    ownerRequired: "다른 참여자에게 방장을 위임한 뒤 나갈 수 있습니다.",
    removeConfirm: "이 참여자를 방에서 내보낼까요?",
    ownerConfirm: "이 참여자에게 방장을 위임할까요?",
    endConfirm: "대화를 종료할까요? 종료 후에는 메시지를 보낼 수 없습니다.",
    title: "참여자 ({count}명)",
    block: "차단하기",
    unblock: "차단 해제",
    blockConfirm: "이 사용자를 차단할까요?",
    leaveConfirm: "방을 나갈까요? 나가면 대화가 종료됩니다.",
    unavailable: "대화가 불가능한 방입니다",
    blocked: "차단한 사용자입니다",
    events: {
      enter: "{members}님이 입장했습니다.",
      invite: "{actor}님이 {targets}님을 초대했습니다.",
      remove: "{actor}님이 {targets}님을 내보냈습니다.",
      owner: "{actor}님이 {targets}님에게 방장을 위임했습니다.",
      deputy: "{actor}님이 {targets}님에게 부반장을 위임했습니다.",
      revoke: "{actor}님이 {targets}님의 부반장 위임을 해제했습니다.",
      leave: "{actor}님이 나갔습니다.",
      end: "{actor}님이 대화를 종료했습니다.",
      name: "{actor}님이 방 이름을 ‘{value}’(으)로 변경했습니다."
    }
  },

  direct: {
    messageRefused: "상대방이 메신저를 받지 않습니다.",
    deleted: "메시지가 삭제되었습니다",
    pin: "상단 고정",
    unpin: "상단 고정 해제",
    mute: "알림 끄기",
    unmute: "알림 켜기",
    readAll: "모두 읽음",
    leave: "나가기",
    new: "신규",
    image: "(이미지)",
    audio: "음성 메시지",
    clearTarget: "귓속말 대상 해제",
    textOnly: "귓속말은 텍스트만 보낼 수 있습니다.",
    whisper: "귓속말",
    message: "메신저",
    inbox: "메신저",
    refused: "상대방이 메시지 수신을 허용하지 않았습니다.",
    offline: "상대방이 접속 중일 때 귓속말을 보낼 수 있습니다.",
    error: "메시지를 불러오거나 보내지 못했습니다. 다시 시도해 주세요.",
    muted: "채팅 금지 중에는 메시지를 보낼 수 없습니다.",
    more: "이전 메신저 보기"
  },

  chatting: {
    receiveWhisper: "귓속말 받기",
    receiveMessage: "메신저 받기",
    stream: "스트림",
    messenger: "메신저",
    message: "메시지",
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
    hidden: "{name}님의 채팅이 지금부터 보이지 않습니다.",
    shown: "{name}님의 채팅이 다시 보이기 시작합니다.",
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
    emoji: {
      emoji: "이모지",
      gif: "GIF",
      sticker: "스티커",
      kaomoji: "카오모지",
      empty: "표시할 항목이 없습니다.",
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
    copied: "복사했습니다.",
    saveFailed: "이미지를 저장하지 못했습니다.",
    copyFailed: "복사하지 못했습니다.",
    removeTitle: "메시지를 삭제할까요?",
    removeSuccess: "메시지를 삭제했습니다.",
    removeFailed: "메시지를 삭제하지 못했습니다.",
    yesterday: "어제",
    action: {
      copyText: "텍스트 복사하기",
      saveImage: "이미지 저장하기",
      copyImage: "이미지 복사하기",
      copyLink: "메시지 링크 복사",
      remove: "메시지 삭제하기",
      report: "메시지 신고하기"
    }
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
    chatOn: "채팅 알림을 켰습니다.",
    chatOff: "채팅 알림을 껐습니다.",
    chatMenu: "메뉴",
    chatSettings: "채팅",
    title: "설정",
    notification: "알림",
    data: "데이터",
    sound: "사운드",
    language: "언어",
    theme: "테마",
    storage: "저장 공간",
    error: "설정을 적용하지 못했습니다. 다시 시도해 주세요.",
    contact: "문의하기",
    contactInfo: "궁금한 점이나 불편한 점을 이메일로 보내 주세요.",
    version: "버전",
    unavailable: "지원하지 않음",
    deviceSettings: "기기 설정",
    devices: "등록된 기기",
    rename: "이름 변경",
    disconnect: "연결 해제",
    unregister: "등록 해제",
    disconnectInfo: "이 기기의 알림 연결을 중지할까요? 기기는 목록에 남습니다.",
    unregisterInfo:
      "이 기기의 알림 등록을 삭제할까요? 다시 받으려면 해당 기기에서 등록해야 합니다.",
    blocked: "알림 권한이 차단되어 있습니다",
    blockedInfo:
      "브라우저의 사이트 설정에서 알림을 허용한 뒤 다시 활성화해 주세요. 다른 기기의 알림 권한에는 영향을 주지 않습니다.",
    chat: "채팅 알림",
    mention: "멘션 알림",
    web: "푸시 알림",
    unnamed: "이름 없는 기기"
  },

  theme: {
    system: "시스템",
    light: "라이트",
    dark: "다크",
    black: "블랙",
    brightness: "밝기"
  },

  language: { system: "시스템", ko: "한국어" },

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

  legal: {
    google: "Google 개인정보처리방침",
    email: "메일 문의:",
    item: "구분",
    data: "처리하는 정보",
    purpose: "이용 목적",
    period: "보관 기간",
    giphy: "GIPHY 개인정보처리방침"
  },

  terms: {
    title: "이용약관",
    heading: "이용약관",

    purpose: {
      title: "제1조 (목적)",
      description:
        "이 약관은 찡 서비스를 이용하는 데 필요한 기본 사항을 정하고, " +
        "서비스와 이용자의 권리와 책임을 안내하기 위한 것입니다."
    },

    profile: {
      title: "제2조 (프로필 및 서비스 이용)",
      description:
        "서비스는 로그인하지 않아도 익명으로 이용할 수 있습니다. " +
        "익명 이용자에게는 서비스 이용을 구분하기 위한 식별정보가 " +
        "자동으로 적용될 수 있습니다.\n" +
        "Google로 로그인하면 여러 기기에서 같은 프로필을 이용할 수 " +
        "있습니다. 처음 연결할 때 Google에서 제공하는 이름과 사진이 " +
        "프로필에 적용될 수 있으며, 이후 서비스에서 변경할 수 있습니다.\n" +
        "닉네임은 24시간에 한 번 변경할 수 있고 프로필 이미지는 " +
        "언제든 변경할 수 있습니다.\n" +
        "다른 사람을 사칭하거나 다른 사람의 정보를 허락 없이 " +
        "프로필에 사용해서는 안 됩니다. 로그아웃은 계정 삭제를 " +
        "의미하지 않습니다."
    },

    service: {
      title: "제3조 (서비스의 제공 및 변경)",
      description:
        "서비스에서는 채팅, 메신저, 귓속말, 이미지와 파일 전송, " +
        "음성 메시지, 그림, 이모티콘, GIF, 스티커, 멘션, 알림 등 " +
        "화면에서 제공되는 기능을 이용할 수 있습니다.\n" +
        "일부 기능은 사용하는 기기, 브라우저, 운영체제와 허용한 " +
        "권한에 따라 제공 범위가 달라질 수 있습니다.\n" +
        "서비스 개선, 점검 또는 외부 서비스의 변경으로 일부 기능이 " +
        "추가되거나 변경되거나 일시적으로 중단될 수 있습니다. " +
        "이용에 큰 영향을 주는 변경은 가능한 범위에서 안내합니다."
    },

    conduct: {
      title: "제4조 (이용 시 지켜야 할 사항)",
      description:
        "서비스를 이용할 때에는 다른 이용자를 존중해야 합니다.\n" +
        "다른 사람을 사칭하거나 괴롭히는 행위, 불법적인 내용을 " +
        "게시하는 행위, 개인정보를 허락 없이 공개하는 행위, " +
        "저작권 등 다른 사람의 권리를 침해하는 행위를 해서는 안 됩니다.\n" +
        "반복적인 광고나 도배, 서비스의 정상적인 이용을 방해하는 " +
        "행위, 서비스 기능을 의도와 다르게 반복적으로 악용하는 " +
        "행위도 허용되지 않습니다.\n" +
        "채팅이나 첨부파일에는 주소, 전화번호 등 공개할 필요가 없는 " +
        "개인정보를 포함하지 않도록 주의해 주세요."
    },

    content: {
      title: "제5조 (게시물과 권리)",
      description:
        "이용자가 작성하거나 업로드한 내용의 권리는 해당 권리자에게 " +
        "있습니다.\n" +
        "서비스는 메시지와 첨부파일을 전달하고 화면에 표시하기 위해 " +
        "필요한 범위에서 내용을 저장하거나 이미지의 크기와 형식을 " +
        "조정할 수 있습니다.\n" +
        "공개 채팅과 공개된 첨부파일은 다른 이용자가 볼 수 있으며, " +
        "기기 기능 등을 이용해 별도로 저장할 수도 있습니다.\n" +
        "서비스에서 내용을 삭제하더라도 삭제 대상과 보관 범위는 " +
        "정보의 종류에 따라 다를 수 있습니다. 개인정보의 삭제와 " +
        "보관에 관한 자세한 내용은 개인정보 처리방침에서 확인할 수 " +
        "있습니다.\n" +
        "법령이나 이 약관을 위반하거나 다른 사람의 권리를 침해하는 " +
        "내용은 서비스 이용 과정에서 제한될 수 있습니다."
    },

    notification: {
      title: "제6조 (알림)",
      description:
        "알림 기능을 켜고 필요한 권한을 허용하면 멘션, 메시지 등 " +
        "서비스 이용과 관련된 알림을 받을 수 있습니다.\n" +
        "웹 알림은 브라우저가 제공하는 알림 기능을 이용하며, " +
        "지원되는 앱에서는 Firebase Cloud Messaging을 이용할 수 " +
        "있습니다.\n" +
        "알림은 서비스, 브라우저 또는 기기 설정에서 끌 수 있습니다. " +
        "기기 설정에 따라 알림 내용이 잠금 화면 등에 표시될 수 " +
        "있으며 네트워크 상태에 따라 알림이 늦게 도착하거나 " +
        "전달되지 않을 수 있습니다."
    },

    restriction: {
      title: "제7조 (서비스 이용 제한)",
      description:
        "약관을 위반하거나 다른 이용자의 정상적인 서비스 이용을 " +
        "지속적으로 방해하는 경우 서비스 이용이 일부 또는 전부 " +
        "제한될 수 있습니다.\n" +
        "이용 제한이 필요한 경우에는 행위의 내용과 정도를 고려하며, " +
        "확인할 수 있는 범위에서 제한 사유와 관련 내용을 안내합니다.\n" +
        "서비스 이용 제한에 대해 확인이 필요한 경우 문의를 통해 " +
        "관련 내용을 요청할 수 있습니다."
    },

    contact: {
      title: "제8조 (문의)",
      description:
        "서비스 이용 중 궁금한 점이나 불편한 점이 있거나 " +
        "계정, 개인정보, 서비스 이용에 관한 확인이 필요한 경우 " +
        "아래 연락처로 문의할 수 있습니다."
    },

    effective: {
      title: "부칙",
      description:
        "이용약관이 변경되는 경우 적용일과 중요한 변경 내용을 " +
        "서비스를 통해 안내합니다. 변경된 약관은 안내된 적용일부터 " +
        "효력이 발생합니다."
    }
  },

  privacy: {
    title: "개인정보 처리방침",
    heading: "개인정보 처리방침",

    collect: {
      title: "제1조 (처리하는 개인정보와 이용 목적)",
      description:
        "찡은 서비스 제공에 필요한 정보만 처리합니다. " +
        "이용하는 기능에 따라 처리하는 정보가 달라질 수 있습니다.\n" +
        "Google 계정의 비밀번호는 수집하거나 저장하지 않습니다.",

      rows: {
        guest: {
          name: "기본 이용",
          data: "사용자 식별정보, 접속정보, 언어",
          purpose: "이용자 구분과 서비스 제공"
        },

        google: {
          name: "Google 로그인 및 프로필",
          data:
            "Google 계정정보, 이메일, 이름, 프로필 사진, " +
            "서비스 이용에 필요한 프로필 정보",
          purpose: "계정 연결, 로그인 유지와 프로필 제공"
        },

        chat: {
          name: "채팅 및 메신저",
          data:
            "메시지, 대화 참여정보, 이미지, 파일, 음성 등 " +
            "이용자가 전송한 내용",
          purpose: "대화와 첨부 콘텐츠 전달 및 표시"
        },

        voice: {
          name: "음성 기능",
          data: "음성, 문장, 언어와 음성 설정",
          purpose: "음성 인식과 음성 생성"
        },

        access: {
          name: "서비스 접속",
          data: "접속정보, 기기 및 브라우저 정보, 이용 기록",
          purpose: "서비스 제공, 오류 확인과 안정적인 이용 지원"
        },

        report: {
          name: "신고",
          data: "신고 대상과 사유, 신고 내용 및 관련 자료",
          purpose: "신고 확인과 이용자 보호"
        },

        notification: {
          name: "알림",
          data: "알림 전달정보와 기기 등록정보",
          purpose: "웹 및 앱 알림 전달"
        },

        contact: {
          name: "문의",
          data: "이메일, 문의 내용과 첨부자료",
          purpose: "문의와 개인정보 관련 요청 처리"
        }
      }
    },

    method: {
      title: "제2조 (개인정보의 수집 방법)",
      description:
        "개인정보는 서비스 이용 과정에서 자동으로 생성되거나 " +
        "이용자가 직접 입력하거나 전송하는 방법으로 수집됩니다.\n" +
        "Google 로그인 시에는 Google에서 제공하는 계정정보를 " +
        "전달받습니다.\n" +
        "이미지, 파일, 음성, 알림 등의 기능은 이용자가 해당 기능을 " +
        "사용할 때 필요한 정보와 권한을 이용합니다."
    },

    retention: {
      title: "제3조 (개인정보의 보유 및 이용 기간)",
      description:
        "개인정보는 서비스 제공에 필요한 기간 동안 보관하며, " +
        "이용 목적이 끝나면 삭제합니다.\n" +
        "계정 삭제를 요청하면 7일 동안 삭제 대기 상태가 되며, " +
        "이 기간 안에는 삭제를 취소할 수 있습니다. " +
        "7일이 지나면 계정 삭제가 진행됩니다.",

      rows: {
        profile: {
          name: "계정, 프로필, 대화 및 파일",
          period:
            "계정 삭제 요청 후 7일 동안 보관합니다. " +
            "계정이 삭제되면 계정 정보와 프로필, 본인이 작성한 " +
            "메신저 메시지를 삭제합니다. " +
            "다른 이용자가 작성한 내용은 유지될 수 있습니다. " +
            "공개 채팅은 작성자를 구분할 수 없는 형태로 " +
            "유지될 수 있습니다."
        },

        records: {
          name: "서비스 이용 및 신고 정보",
          period:
            "서비스 이용에 필요한 기간 동안 보관합니다. " +
            "계정 삭제 시 관련 정보를 정리하며, 법령에 따라 " +
            "보관이 필요한 정보는 정해진 기간 동안 보관할 수 있습니다."
        },

        push: {
          name: "알림 등록정보",
          period:
            "알림을 해제하거나 기기 등록을 해제할 때까지 보관합니다. " +
            "더 이상 사용할 수 없는 정보는 삭제합니다."
        },

        draft: {
          name: "임시 저장정보",
          period:
            "프로필 설정이나 기기 사이의 파일 전달 등에 필요한 " +
            "임시 정보는 사용이 끝나거나 일정 시간이 지나면 삭제합니다."
        },

        contact: {
          name: "문의",
          period: "문의와 요청을 처리하는 데 필요한 기간 동안 보관합니다."
        }
      }
    },
    deletion: {
      title: "제4조 (개인정보의 파기)",
      description:
        "이용 목적이 끝난 개인정보는 삭제합니다.\n" +
        "계정 삭제 시 계정 정보, 프로필, 알림 등록정보 등 " +
        "계정과 연결된 정보를 함께 정리합니다.\n" +
        "다른 이용자와 함께 사용하는 대화나 파일은 서비스 이용에 " +
        "필요한 범위에서 일부 유지될 수 있습니다.\n" +
        "브라우저의 쿠키나 저장정보를 삭제하는 것과 서버에 저장된 " +
        "정보를 삭제하는 것은 서로 다릅니다."
    },

    storage: {
      title: "제5조 (보관 장소와 공개 범위)",
      description:
        "서비스에서 보관하는 정보는 현재 대한민국의 서버에 " +
        "저장됩니다.\n" +
        "닉네임, 프로필 사진, 활동 상태, 공개 채팅과 공개된 " +
        "첨부파일은 다른 이용자에게 표시될 수 있습니다.\n" +
        "이메일, IP 주소, 알림 전달정보 등은 공개 프로필에 " +
        "표시하지 않습니다."
    },

    external: {
      title: "제6조 (외부 서비스 이용)",
      description:
        "일부 기능은 외부 서비스를 이용해 제공됩니다. " +
        "해당 기능을 이용할 때 필요한 정보가 외부 서비스로 " +
        "전달될 수 있습니다.\n" +
        "외부 서비스에서 처리하는 정보에는 해당 서비스의 " +
        "개인정보 처리방침이 적용될 수 있습니다.\n" +
        "개인정보를 광고나 마케팅 목적으로 판매하지 않습니다.",

      rows: {
        google: {
          name: "Google 로그인",
          purpose: "로그인과 프로필 연결",
          data: "계정정보, 이메일, 이름, 프로필 사진"
        },

        speech: {
          name: "Google 음성 서비스",
          purpose: "음성 인식과 음성 생성",
          data: "음성, 문장, 언어와 음성 설정"
        },

        push: {
          name: "푸시 알림 서비스",
          purpose: "웹 및 앱 알림 전달",
          data: "알림 전달정보, 기기 등록정보와 알림 내용"
        },

        giphy: {
          name: "GIPHY",
          purpose: "GIF 및 스티커 제공",
          data: "검색 및 콘텐츠 요청정보"
        },

        soop: {
          name: "SOOPLIVE 및 OGQ",
          purpose: "이모티콘 제공",
          data: "이모티콘 및 이미지 요청정보"
        },

        mail: {
          name: "Gmail",
          purpose: "이메일 문의",
          data: "이메일, 문의 내용과 첨부자료"
        }
      }
    },

    cookies: {
      title: "제7조 (쿠키와 기기 내 저장정보)",
      description:
        "로그인 상태 유지, 이용자 구분과 화면 설정 저장을 위해 " +
        "쿠키와 브라우저 저장공간을 사용할 수 있습니다.\n" +
        "브라우저에서 이를 삭제하거나 제한할 수 있지만 일부 설정이 " +
        "초기화되거나 기능 이용에 영향을 줄 수 있습니다.\n" +
        "기기에 저장된 정보를 삭제해도 서버에 저장된 정보가 함께 " +
        "삭제되는 것은 아닙니다.",

      rows: {
        cookie: {
          name: "쿠키",
          purpose: "로그인 유지와 이용자 구분",
          period:
            "사용자 식별에 필요한 쿠키는 최대 1년 동안 유지될 수 " +
            "있습니다. 일시적인 확인용 쿠키는 사용이 끝나거나 " +
            "정해진 시간이 지나면 삭제됩니다."
        },

        local: {
          name: "Local Storage",
          purpose: "언어, 테마와 화면 설정 저장",
          period: "직접 삭제하거나 브라우저에서 저장정보를 정리할 때까지"
        },

        session: {
          name: "Session Storage",
          purpose: "현재 탭에서 사용하는 임시 정보 저장",
          period: "현재 탭의 세션이 끝날 때까지"
        },

        cache: {
          name: "브라우저 캐시 및 오프라인 저장",
          purpose: "화면과 파일을 빠르게 표시",
          period: "캐시가 교체되거나 저장정보를 삭제할 때까지"
        }
      }
    },

    rights: {
      title: "제8조 (이용자의 권리)",
      description:
        "로그인한 이용자는 프로필에서 자신의 정보를 변경할 수 " +
        "있습니다.\n" +
        "알림과 브라우저 저장정보는 서비스, 브라우저 또는 기기 " +
        "설정에서 관리할 수 있습니다.\n" +
        "개인정보의 열람, 정정, 삭제 또는 처리 중지를 원하는 경우 " +
        "아래 연락처로 요청할 수 있습니다. 필요한 경우 본인 확인을 " +
        "요청할 수 있습니다.\n" +
        "로그아웃은 계정 삭제나 개인정보 삭제를 의미하지 않습니다."
    },

    security: {
      title: "제9조 (개인정보 보호)",
      description:
        "개인정보는 서비스 제공에 필요한 범위에서 관리하며 " +
        "불필요하게 공개되지 않도록 보호합니다.\n" +
        "채팅이나 첨부파일에는 전화번호, 주소 등 공개할 필요가 없는 " +
        "개인정보를 포함하지 않도록 주의해 주세요."
    },

    contact: {
      title: "제10조 (개인정보 문의)",
      description:
        "개인정보 처리에 관한 문의나 정보의 열람, 정정, 삭제 등 " +
        "요청은 아래 연락처를 통해 접수할 수 있습니다."
    },

    changes: {
      title: "제11조 (개인정보 처리방침 변경)",
      description:
        "개인정보 처리방침이 변경되면 적용일과 중요한 변경 내용을 " +
        "서비스를 통해 안내합니다."
    }
  },

  report: {
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
    time: "신고 일시",
    description: "추가 설명"
  },

  admin: {
    panel: "관리자",
    heading: "알림 전송",
    title: "제목",
    body: "내용",
    image: "이미지",
    url: "이동 주소",
    send: "전송",
    users: "사용자 검색",
    status: "서비스 상태",
    database: "DB 관리",
    readonly:
      "읽기 전용입니다. 사용자 제재와 신고 처리는 해당 관리 기능을 이용해주세요.",
    search: "검색",
    filter: "필터 값 (정확히 일치)",
    all: "전체 필드",
    previous: "이전",
    next: "다음",
    details: "상세 보기",
    empty: "표시할 항목이 없습니다.",
    error: "요청을 처리하지 못했습니다.",
    server: "서버",
    uptime: "서버 가동 시간",
    push: "웹 푸시 설정",
    fcm: "Firebase 알림 설정",
    ready: "정상",
    unavailable: "확인 필요",
    configured: "설정됨",
    disabled: "설정 안 됨",
    sent: "전송 {sent}건 / 실패 {failed}건",
    confirm: "등록된 기기에 알림을 발송할까요?",
    refresh: "새로고침"
  },

  error: { heading: "페이지 없음", action: "홈으로" },

  offline: { heading: "오프라인", action: "다시 연결" },

  denied: { heading: "쿠키 필요", action: "다시 시도" },

  maint: { heading: "점검 중", action: "다시 확인" },

  block: { heading: "접근 거부", action: "다시 확인" },

  dialog: { title: "제목", confirm: "확인", cancel: "취소" }
};
