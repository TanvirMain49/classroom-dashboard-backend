import express from 'express';
import { enrollmentPostController } from '../controller/enrollments.controller';

const router = express.Router();

router.route('/').post(enrollmentPostController);
router.route('/join').get(enrollmentPostController);


export default router;