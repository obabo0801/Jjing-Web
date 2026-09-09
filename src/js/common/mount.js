const components = new Set();

export function register(...items) {
  items.forEach((item) => components.add(item));
}

export default function mount(root = document) {
  if (!components.size) {
    throw new Error("DOM components must be registered by init before mount");
  }

  // 컴포넌트 구성은 init에서, 여기서는 전달한 DOM만 준비합니다.
  components.forEach((component) => component(root));
}
