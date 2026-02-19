import express from 'express';
import { classesGetController, classesGetDetailsController, classesPostController, classesUserController } from '../controller/classes.controller';

const router = express.Router();

router.route('/').post(classesPostController);
router.route('/').get( classesGetController );
router.route('/:id').get( classesGetDetailsController );
router.route('/:id/users').get( classesUserController );

export default router;