import Mail from '../../lib/Mail';

class EnrollStudentMail {
  get key() {
    return 'EnrollStudentMail';
  }

  async handle({ data }) {
    const { enroll } = data;

    await Mail.sendMail({
      to: `${enroll.student.name} <${enroll.student.email}>`,
      subject: 'Informações sobre o seu plano',
      text: 'Informações sobre o seu plano em GymPass',
    });
  }
}

export default new EnrollStudentMail();
