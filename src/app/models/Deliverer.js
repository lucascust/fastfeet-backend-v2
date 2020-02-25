import Sequelize, { Model } from 'sequelize';

class Deliverer extends Model {
  // Parâmetro de entrada é a conexão do model
  static init(sequelize) {
    // Iniciando classe pai de user (Model)
    super.init(
      {
        // definição das colunas (sem PK, FK e Create/Update)
        first_name: Sequelize.STRING,
        last_name: Sequelize.STRING,
        email: Sequelize.STRING,
      },
      {
        sequelize,
      }
    );
  }
}

export default Deliverer;
