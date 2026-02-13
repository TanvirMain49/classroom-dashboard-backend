import express from 'express';
import { subjectsController as subjects } from '../controller/subjects.controller';

const router = express.Router();

router.route('/').get(subjects);

export default router;