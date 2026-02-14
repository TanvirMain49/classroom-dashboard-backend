import express from 'express';
import { classesGetController, classesPostController } from '../controller/classes.controller';

const router = express.Router();

router.route('/').post(classesPostController);
router.route('/').get( classesGetController )

export default router;