import * as Yup from 'yup';
import {
  addMonths,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isBefore,
} from 'date-fns';
import { Op } from 'sequelize';

import Enroll from '../models/Enroll';
import Plan from '../models/Plan';
import Student from '../models/Student';

import EnrollStudentMail from '../jobs/EnrollStudentMail';
import Queue from '../../lib/Queue';

class EnrollController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const { count, rows: enroll } = await Enroll.findAndCountAll({
      attributes: ['id', 'start_date', 'end_date', 'price', 'active'],
      where: {
        start_date: { [Op.not]: null },
        end_date: { [Op.not]: null },
      },
      order: ['created_at'],
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
      ],
    });

    return res.json({
      offset: (page - 1) * 10,
      totalPages: Math.ceil(count / 10),
      rows: enroll,
    });
  }

  async getById(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.params)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;

    const enroll = await Enroll.findByPk(id, {
      attributes: [
        'id',
        'student_id',
        'plan_id',
        'start_date',
        'end_date',
        'price',
      ],
      include: [
        {
          model: Plan,
          as: 'plan',
          attributes: ['title', 'duration'],
        },
      ],
    });

    //       include: [
    //     {
    //       model: Student,
    //       as: 'student',
    //       attributes: ['name', 'email'],
    //       where: {
    //         id: student_id,
    //       },
    //     },
    //     {
    //       model: Plan,
    //       as: 'plan',
    //       attributes: ['title'],
    //       where: {
    //         id: plan_id,
    //       },
    //     },
    //   ],
    // });

    if (!enroll)
      return res.status(400).json({ error: 'Enroll does not exists' });

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

    // Verify retroactive date
    if (isBefore(startOfDay(new Date(start_date)), startOfDay(new Date())))
      return res
        .status(400)
        .json({ error: 'the start date cannot be before the current date' });

    // Verifica a existencia de outra matricula em andamento
    const currentEnroll = await Enroll.findOne({
      where: { student_id },
      attributes: ['id', 'start_date', 'end_date'],
      order: [['createdAt', 'ASC']],
      limit: 1,
    });

    if (currentEnroll) {
      if (
        isWithinInterval(new Date(), {
          start: new Date(currentEnroll.start_date),
          end: new Date(currentEnroll.end_date),
        })
      )
        return res
          .status(400)
          .json({ error: 'The student is currently enrolled' });
    }

    // Find plan
    const plan = await Plan.findByPk(plan_id, {
      attributes: ['title', 'duration', 'price'],
    });

    // Check if Plans exists
    if (!plan) return res.status(400).json({ error: 'Plan does not exists' });

    const { duration } = plan;

    // Set de EndDate
    const startDate = startOfDay(new Date(start_date));
    const endDate = endOfDay(addMonths(startDate, duration));

    // SetTotalPrice
    const totalPrice = plan.duration * plan.price;

    const enroll = await Enroll.create({
      student_id,
      plan_id,
      start_date: startDate,
      end_date: endDate,
      price: totalPrice,
    }).then(async response => {
      const newEnroll = await Enroll.findByPk(response.id, {
        attributes: ['id', 'student_id', 'plan_id', 'start_date', 'end_date'],
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
            attributes: ['title'],
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

  // No update não fiz validação de data retroativa, pois pensei em alguma possibilidade de correção
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

    const startDate = startOfDay(new Date(start_date));
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
