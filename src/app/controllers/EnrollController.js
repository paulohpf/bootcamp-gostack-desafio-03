import * as Yup from 'yup';
import { parseISO, addMonths, startOfDay, endOfDay } from 'date-fns';
import { Op } from 'sequelize';

import Enroll from '../models/Enroll';
import Plan from '../models/Plan';
import Student from '../models/Student';

import EnrollStudentMail from '../jobs/EnrollStudentMail';
import Queue from '../../lib/Queue';

class EnrollController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const enroll = await Enroll.findAll({
      attributes: ['id', 'start_date', 'end_date', 'price'],
      where: {
        start_date: { [Op.not]: null },
        end_date: { [Op.not]: null },
      },
      order: ['created_at'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title', 'duration', 'price'],
        },
      ],
    });

    return res.json(enroll);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      plan_id: Yup.number().required(),
      start_date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { student_id, plan_id, start_date } = req.body;

    // Find plan
    const plan = await Plan.findOne({
      where: { id: plan_id },
      attributes: ['title', 'duration', 'price'],
    });

    // Check if Plans exists
    if (!plan) return res.status(400).json({ error: 'Plan does not exists' });

    // Set de EndDate
    const startDate = startOfDay(parseISO(start_date));
    const endDate = endOfDay(addMonths(startDate, plan.duration));

    const enroll = await Enroll.create({
      student_id,
      plan_id,
      start_date: startDate,
      end_date: endDate,
      price: plan.price,
    }).then(async response => {
      const newEnroll = await Enroll.findByPk(response.id, {
        attributes: ['id', 'start_date', 'end_date'],
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['name', 'email'],
            where: {
              id: student_id,
            },
          },
          {
            model: Plan,
            as: 'plan',
            attributes: ['title', 'duration', 'price'],
            where: {
              id: plan_id,
            },
          },
        ],
      });

      return newEnroll;
    });

    await Queue.add(EnrollStudentMail.key, {
      enroll,
    });

    return res.json(enroll);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
      start_date: Yup.date().required(),
      plan_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id, start_date, plan_id } = req.body;

    const enroll = await Enroll.findByPk(id, {
      attributes: ['id', 'start_date', 'end_date', 'price'],
    });

    if (!enroll)
      return res.status(400).json({ error: 'Enroll does not exists' });

    const plan = await Plan.findByPk(plan_id, {
      attributes: ['id', 'title', 'duration', 'price'],
      where: {
        id: plan_id,
      },
    });

    const startDate = startOfDay(parseISO(start_date));
    const endDate = endOfDay(addMonths(startDate, plan.duration));

    const enrollUpdated = await enroll.update({
      start_date: startDate,
      end_date: endDate,
      price: plan.price,
      plan_id: plan.id,
    });

    return res.json(enrollUpdated);
  }

  async delete(req, res) {
    const enroll = await Enroll.findByPk(req.params.id);

    if (!enroll)
      return res.status(400).json({ error: 'Enroll does not exists' });

    enroll.start_date = null;
    enroll.end_date = null;

    await enroll.save();

    return res.json(enroll);
  }
}

export default new EnrollController();
