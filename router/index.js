import { Router } from "express";

import {
  admin, i18n, push, stt, tts, user
} from "#config/route";

import admins from "#router/admin";
import locale from "#router/i18n";
import subs from "#router/push";
import listen from "#router/stt";
import speech from "#router/tts";
import users from "#router/user";

const router = Router();

router.use(admin, admins);
router.use(i18n, locale);
router.use(push, subs);
router.use(stt, listen);
router.use(tts, speech);
router.use(user, users);

export default router;
