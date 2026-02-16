import express from 'express';
import { classesGetController, classesGetDetailsController, classesPostController } from '../controller/classes.controller';

const router = express.Router();

router.route('/').post(classesPostController);
router.route('/').get( classesGetController );
router.route('/:id').get( classesGetDetailsController );

export default router;