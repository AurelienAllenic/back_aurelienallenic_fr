const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const cvController = require("../controllers/cvController");
const authController = require("../controllers/authController");
const { uploadCvFields } = require("../middlewares/multer");
const messageController = require("../controllers/messageController")

router.post("/contact", contactController.handleContact);
router.get("/messages", authController.requireAuth, messageController.findAllMessages);
router.get("/message/:id", authController.requireAuth, messageController.findOneMessage);
router.delete("/message/:id", authController.requireAuth, messageController.deleteMessage)

router.get("/cv", cvController.getCv);
router.put(
  "/cv",
  authController.requireAuth,
  uploadCvFields,
  cvController.upsertCv
);
router.delete("/cv", authController.requireAuth, cvController.deleteCv);

module.exports = router;