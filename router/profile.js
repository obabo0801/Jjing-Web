import { Router } from "express";

import editor from "#router/profile/editor";
import image from "#router/profile/image";
import view from "#router/profile/view";
import manage from "#router/profile/manage";

const router = Router();

// 고정 경로를 먼저 연결하고, /:uid 조회는 그 뒤에 둡니다.
router.use(editor);
router.use(image);
router.use(view);
router.use(manage);

export default router;
