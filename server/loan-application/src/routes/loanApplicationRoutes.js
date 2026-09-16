import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  getApplication,
  getStatus,
  saveDraft,
  sendOtp,
  submitApplication,
  uploadDocument,
  verifyOtp,
} from '../controllers/loanApplicationController.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = req.validationErrors ? req.validationErrors() : [];
  if (errors?.length) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }
  next();
};

router.post('/save-draft', authenticate, [
  body('personalDetails.email').optional().isEmail().withMessage('Invalid email format'),
  body('personalDetails.mobileNumber').optional().matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
  body('personalDetails.panNumber').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('PAN format is invalid'),
  body('personalDetails.aadhaarNumber').optional().matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'),
], validateRequest, saveDraft);

router.get('/:id', authenticate, [param('id').isMongoId().withMessage('Invalid application ID')], validateRequest, getApplication);
router.post('/upload-document', authenticate, upload.single('document'), uploadDocument);
router.post('/send-otp', authenticate, [body('applicationId').isMongoId().withMessage('Invalid application ID')], validateRequest, sendOtp);
router.post('/verify-otp', authenticate, [body('applicationId').isMongoId().withMessage('Invalid application ID')], validateRequest, verifyOtp);
router.post('/submit', authenticate, [
  body('personalDetails.email').optional().isEmail().withMessage('Invalid email format'),
  body('personalDetails.mobileNumber').optional().matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
  body('personalDetails.panNumber').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('PAN format is invalid'),
  body('personalDetails.aadhaarNumber').optional().matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'),
], validateRequest, submitApplication);
router.get('/status/:id', authenticate, [param('id').isMongoId().withMessage('Invalid application ID')], validateRequest, getStatus);

export default router;
