import * as Yup from 'yup';
import { getHours } from 'date-fns';

import Order from '../models/Order';
import Recipient from '../models/Recipient';
import Deliverer from '../models/Deliverer';

class OrderController {
  async store(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().max(150),
      deliverer_id: Yup.number(),
      recipient_id: Yup.number(),
    });
    /**
     * Verify if input fit in schema, returning scpecific message
     */
    const schemaVerify = await schema.validate(req.body).catch(err => {
      return err.message;
    });
    if (typeof schemaVerify === 'string') {
      return res.status(400).json({ error: schemaVerify });
    }

    /**
     * Existance verifications
     */
    const delivererVerify = await Deliverer.findOne({
      where: { id: req.body.deliverer_id },
    });
    if (!delivererVerify) {
      return res.status(400).json({ error: 'Deliverer does not exist.' });
    }
    const recipientVerify = await Recipient.findOne({
      where: { id: req.body.recipient_id },
    });
    if (!recipientVerify) {
      return res.status(400).json({ error: 'Recipient does not exist.' });
    }

    const {
      product,
      recipient_id,
      deliverer_id,
      quantity,
    } = await Order.create(req.body);

    return res.json({ product, recipient_id, deliverer_id, quantity });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().max(150),
      started: Yup.bool(),
      ended: Yup.bool(),
    });
    /**
     * Verify if input fit in schema, returning scpecific message
     */
    const schemaVerify = await schema.validate(req.body).catch(err => {
      return err.message;
    });
    if (typeof schemaVerify === 'string') {
      return res.status(400).json({ error: schemaVerify });
    }

    const { id } = req.params;
    const { started, ended } = req.body;
    const date = new Date();
    const dateHour = getHours(date);

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    /**
     * Deliverer start the transport
     * Time range: 8h -> 18h
     */
    if (started) {
      if (dateHour < 8 || dateHour > 18) {
        return res
          .status(401)
          .json({ error: 'You can only start order between 8 and 18 hours' });
      }
      await order.update({ start_date: date });
      return res.json({ start_date: order.start_date, started });
    }

    /**
     * Order delivered update
     */
    if (ended) {
      if (order.start_date === null) {
        return res
          .status(401)
          .json({ error: 'You can not finish an order that have not started' });
      }
      await order.update({ end_date: date });
      return res.json({ end_date: order.end_date, ended });
    }

    const { product, signature_id } = await order.update(req.body);

    return res.json({ product, signature_id });
  }

  async delete(req, res) {
    const { id } = req.params;

    const order = await Order.findByPk(id);

    /**
     * Verify if it's cancelable
     * Condition: deliverer still don't take the order
     */
    if (!(order.started === null)) {
      return res
        .status(400)
        .json({ error: 'Deliverer has already started order' });
    }
    const { canceled_at } = await order.update({ canceled_at: new Date() });

    return res.json({ canceled_at });
  }
}
export default new OrderController();
