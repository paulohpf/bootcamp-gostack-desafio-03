import Mail from '../../lib/Mail';

class AnswerHelpOrder {
  get key() {
    return 'AnswerHelpOrder';
  }

  async handle({ data }) {
    const { helpOrder } = data;

    await Mail.sendMail({
      to: `${helpOrder.student.name} <${helpOrder.student.email}>`,
      subject: 'Gympass - Sua pergunta foi respondida!',
      text: `Sua pergunta foi respondida: \n Pergunta: ${helpOrder.question}\n Resposta: ${helpOrder.answer}`,
    });
  }
}

export default new AnswerHelpOrder();
