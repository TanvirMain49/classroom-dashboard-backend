import express from 'express';
import { subjectsPostController, subjectsController, subjectsGetController, subjectsClassesController, subjectsUserController } from '../controller/subjects.controller';

const router = express.Router();

router.route('/').get(subjectsController);
router.route('/').post( subjectsPostController );
router.route('/:id').get( subjectsGetController );
router.route('/:id/classes').get( subjectsClassesController );
router.route('/:id/users').get(subjectsUserController);

export default router;