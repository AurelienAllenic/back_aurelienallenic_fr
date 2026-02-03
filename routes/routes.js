const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const cvController = require("../controllers/cvController");
const authController = require("../controllers/authController");
const analyticsController = require("../controllers/analyticsController");
const { uploadCvFields } = require("../middlewares/multer");

router.post("/contact", contactController.handleContact);

router.get("/cv", cvController.getCv);
router.put(
  "/cv",
  authController.requireAuth,
  uploadCvFields,
  cvController.upsertCv
);
router.delete("/cv", authController.requireAuth, cvController.deleteCv);


router.post('/track', analyticsController.trackEvent);

module.exports = router;