import express from 'express';
import { enrollmentJoin, enrollmentPostController } from '../controller/enrollments.controller';

const router = express.Router();

router.route('/').post(enrollmentPostController);
router.route('/join').post(enrollmentJoin);


export default router;