AWS.config.update({ region: process.env.AWS_REGION });

// We will configure our construct to 
// look for the .handler function
exports.handler = async function (event) {
  try {
    // Kinesis will deliver records 
    // in batches, so we need to iterate through
    // each record in the batch
    for (let record of event.Records) {
      const reading = parsePayload(record.kinesis.data);
      await writeRecord(record.kinesis.partitionKey, reading);
    };
  } catch (err) {
    console.log(`Write failed, err:\n${JSON.stringify(err, null, 2)}`);
    throw err;
  }
  return;
};

// Write the provided sensor reading data to the DynamoDB table
async function writeRecord(partitionKey, reading) {

  var params = {
    // Notice that Constructs automatically sets up 
    // an environment variable with the table name.
    TableName: process.env.DDB_TABLE_NAME,
    Item: {
      partitionKey: { S: partitionKey },  // sensor Id
      timestamp: { S: reading.timestamp },
      value: { N: reading.value}
    },
  };

  // Call DynamoDB to add the item to the table
  await ddb.putItem(params).promise();
}

// Decode the payload and extract the sensor data from it
function parsePayload(payload) {

  const decodedPayload = Buffer.from(payload, "base64").toString(
    "ascii"
  );

  // Our CLI command will send the records to Kinesis
  // with the values delimited by '|'
  const payloadValues = decodedPayload.split("|", 2)
  return {
    value: payloadValues[0],
    timestamp: payloadValues[1]
  }
}