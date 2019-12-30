import * as Yup from 'yup';
import { subDays, isWithinInterval } from 'date-fns';
import { Op } from 'sequelize';

import Checkin from '../models/Checkin';
import Enroll from '../models/Enroll';
import Student from '../models/Student';

class EnrollController {
  async index(req, res) {
    const scheme = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await scheme.isValid(req.params)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;
    const { page = 1 } = req.query;

    const { count, rows: checkins } = await Checkin.findAndCountAll({
      where: {
        student_id: id,
      },
      attributes: ['id', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10,
      offset: (page - 1) * 10,
      include: [{ model: Student, as: 'student', attributes: ['id', 'name'] }],
    });

    return res.json({
      offset: (page - 1) * 10,
      totalPages: Math.ceil(count / 10) !== 0 ? Math.ceil(count / 10) : 1,
      rows: checkins,
    });
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.params)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;

    // Verificação de existencia de estudante
    const studentExists = await Student.findByPk(id);

    if (!studentExists)
      return res.status(400).json({ error: 'Student does not exists' });

    const currentDate = new Date();
    const pastDate = subDays(new Date(), 7);

    // Verificação de matricula em andamaneto
    const currentEnroll = await Enroll.findOne({
      where: { student_id: id },
      attributes: ['id', 'start_date', 'end_date'],
      order: [['createdAt', 'ASC']],
      limit: 1,
    });

    if (currentEnroll) {
      if (
        !isWithinInterval(new Date(), {
          start: new Date(currentEnroll.start_date),
          end: new Date(currentEnroll.end_date),
        })
      )
        return res.status(400).json({ error: 'The student is not enrolled' });
    } else {
      return res.status(400).json({ error: 'The student is not enrolled' });
    }

    // Verificação do periodo de 7 dias corridos
    const { count: checkins } = await Checkin.findAndCountAll({
      where: {
        student_id: id,
        created_at: { [Op.between]: [pastDate, currentDate] },
      },
    });

    if (checkins >= 5)
      return res
        .status(400)
        .json({ error: 'Student has reached checkins limit' });

    const ckeckin = await Checkin.create({ student_id: id });

    return res.json(ckeckin);
  }
}

export default new EnrollController();
