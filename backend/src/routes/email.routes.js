import express from "express";
import {
  sendEmail,
  saveDraft,
  getMailboxStatus,
  receiveInboundEmail,
  getInbox,
  getSent,
  getDrafts,
  getArchive,
  getTrash,
  deleteEmail,
  starEmail,
  pinEmail,
  archiveEmail,
  moveEmail,
  toggleRead,
  reportEmail,
  sweepSenderEmails,
  permanentlyDeleteEmail,
  downloadAttachment,
  getRecipientSuggestions,
  syncMailboxNow,
} from "../controllers/email.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/inbound", receiveInboundEmail);
router.post("/send", authMiddleware, sendEmail);
router.post("/draft", authMiddleware, saveDraft);
router.get("/sync/status", authMiddleware, getMailboxStatus);
router.post("/sync/now", authMiddleware, syncMailboxNow);
router.get("/recipient-suggestions", authMiddleware, getRecipientSuggestions);
router.get("/inbox", authMiddleware, getInbox);
router.get("/sent", authMiddleware, getSent);
router.get("/drafts", authMiddleware, getDrafts);
router.get("/archive", authMiddleware, getArchive);
router.get("/trash", authMiddleware, getTrash);
router.get("/:id/attachment/:attachmentId", authMiddleware, downloadAttachment);
router.delete("/:id", authMiddleware, deleteEmail);
router.delete("/permanent/:id", authMiddleware, permanentlyDeleteEmail);
router.patch("/star/:id", authMiddleware, starEmail);
router.patch("/pin/:id", authMiddleware, pinEmail);
router.patch("/archive/:id", authMiddleware, archiveEmail);
router.patch("/move/:id", authMiddleware, moveEmail);
router.patch("/read/:id", authMiddleware, toggleRead);
router.patch("/report/:id", authMiddleware, reportEmail);
router.post("/sweep/:id", authMiddleware, sweepSenderEmails);

export default router;
