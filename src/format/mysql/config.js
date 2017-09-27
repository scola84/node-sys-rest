const parts = {
  structure: `
    SELECT TABLE_NAME AS name
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = '%(db)s'`
};

export default class MysqlAuth {
  structure() {
    return parts.structure;
  }
}
