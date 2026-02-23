import express from 'express';
import { statsChart, statsLatest, statsOverView } from '../controller/stats.controller';

const router = express.Router();

// router.route('/overview').get(statsOverView);
// router.route('/latest').get(statsLatest);
router.route('/chart').get(statsChart);


export default router;