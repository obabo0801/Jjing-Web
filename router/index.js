import { Router } from "express";

import * as route from "#config/route";

import admin from "#router/admin";
import events from "#router/events";
import fcm from "#router/fcm";
import i18n from "#router/i18n";
import profile from "#router/profile";
import push from "#router/push";
import stt from "#router/stt";
import tts from "#router/tts";
import user from "#router/user";

const router = Router();

router.use(route.admin, admin);
router.use(route.events, events);
router.use(route.fcm, fcm);
router.use(route.i18n, i18n);
router.use(route.profile, profile);
router.use(route.push, push);
router.use(route.stt, stt);
router.use(route.tts, tts);
router.use(route.user, user);

export default router;
