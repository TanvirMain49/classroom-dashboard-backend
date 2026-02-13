import express from 'express';
import { classesPostController } from '../controller/classes.controller';

const router = express.Router();

router.route('/').post(classesPostController);

export default router;