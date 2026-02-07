import express from 'express';
import { asyncHandler } from '../utils/async-handler.utils';
import { subjectsController as subjects } from '../controller/subjects.controller';

const router = express.Router();

router.route('/').get(subjects);

export default router;