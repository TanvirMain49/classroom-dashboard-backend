import express from 'express';
import { subjectsPostController, subjectsController } from '../controller/subjects.controller';

const router = express.Router();

router.route('/').get(subjectsController);
router.route('/').post(subjectsPostController);

export default router;