import * as Yup from 'yup';
import { format, isWithinInterval } from 'date-fns';

import Enroll from '../models/Enroll';
import Student from '../models/Student';
import HelpOrder from '../models/HelpOrder';
import Queue from '../../lib/Queue';
import AnswerHelpOrder from '../jobs/AnswerHelpOrder';

class HelpOrderController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const helpOrders = await HelpOrder.findAll({
      attributes: ['id', 'question', 'answer', 'answer_at'],
      order: ['created_at'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
    });

    return res.json(helpOrders);
  }

  async indexNotAnsewerd(req, res) {
    const { page = 1 } = req.query;

    const helpOrders = await HelpOrder.findAll({
      where: {
        answer: null,
      },
      attributes: ['id', 'question', 'answer', 'answer_at'],
      order: ['created_at'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
    });

    return res.json(helpOrders);
  }

  async indexById(req, res) {
    const scheme = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await scheme.isValid(req.params)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;
    const { page = 1 } = req.query;
    const helpOrders = await HelpOrder.findAll({
      where: {
        student_id: id,
      },
      attributes: ['id', 'question', 'answer', 'answer_at'],
      order: ['created_at'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
    });

    return res.json(helpOrders);
  }

  async store(req, res) {
    const scheme = Yup.object().shape({
      question: Yup.string().required(),
    });

    if (!(await scheme.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;

    const studentExists = await Student.findByPk(id);

    // Verify if User Exists
    if (!studentExists)
      return res.status(400).json({ error: 'Student does not exists' });

    const currentEnroll = await Enroll.findOne({
      where: { student_id: id },
      attributes: ['id', 'start_date', 'end_date'],
      order: [['createdAt', 'ASC']],
      limit: 1,
    });

    // Verify if User Enrolled
    if (
      !isWithinInterval(new Date(), {
        start: new Date(currentEnroll.start_date),
        end: new Date(currentEnroll.end_date),
      })
    ) {
      return res.status(400).json({ error: 'User is not enrolled' });
    }

    const { question } = req.body;

    const helpOrder = await HelpOrder.create({
      student_id: id,
      question,
    }).then(async response => {
      const newHelpOrder = await HelpOrder.findByPk(response.id, {
        attributes: ['id', 'question'],
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'name'],
          },
        ],
      });

      return newHelpOrder;
    });

    return res.json(helpOrder);
  }

  async update(req, res) {
    const scheme = Yup.object().shape({
      answer: Yup.string().required(),
    });

    if (!(await scheme.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;
    const { answer } = req.body;
    const currentDate = new Date();

    const helpOrder = await HelpOrder.findByPk(id, {
      attributes: ['id', 'question', 'answer', 'answer_at'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    console.log(helpOrder.student.name);

    helpOrder.answer = answer;
    helpOrder.answer_at = format(currentDate, "yyyy-MM-dd'T'HH:mm:ssxxx");

    const { student_id, question, answer_at, student } = await helpOrder.save();

    await Queue.add(AnswerHelpOrder.key, {
      helpOrder,
    });

    return res.json({
      id,
      student_id,
      question,
      answer,
      answer_at,
      student,
    });
  }
}

export default new HelpOrderController();
