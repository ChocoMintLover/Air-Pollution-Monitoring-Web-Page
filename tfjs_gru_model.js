const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../pollution_data/baseline_data/Busan_pollution_data_3_years.csv');

async function loadData() {
    const dataset = tf.data.csv(dataPath, {
        columnNames: ['timestamp', 'sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5', 'sensor6', 'sensor7', 'sensor8', 'sensor9'], // 예시로 컬럼명 설정
        hasHeader: true,
    });

    const data = await dataset.toArray();
    const features = data.map(d => [
        d.sensor1, d.sensor2, d.sensor3, d.sensor4, d.sensor5, d.sensor6, d.sensor7, d.sensor8, d.sensor9
    ]);
    const labels = data.map(d => [
        d.sensor1, d.sensor2, d.sensor3, d.sensor4, d.sensor5, d.sensor6, d.sensor7 // 예시로 라벨 설정
    ]);

    const featureTensor = tf.tensor3d(features, [features.length, 30, 9]); // 시간 30개, 센서 9개
    const labelTensor = tf.tensor2d(labels, [labels.length, 7, 9]);

    return { features: featureTensor, labels: labelTensor };
}

const model = tf.sequential();

model.add(
    tf.layers.gru({
        units: 64,
        returnSequences: true, 
        inputShape: [30, 9],
        activation: 'tanh'
    })
);
model.add(tf.layers.dropout({ rate: 0.2 }));
model.add(tf.layers.batchNormalization());
model.add(
    tf.layers.gru({
        units: 32,
        activation: 'tanh'
    })
);
model.add(tf.layers.dense({ units: 7 * 9 })); // 7 * 9 = 63
model.add(tf.layers.reshape({ targetShape: [7, 9] })); // reshape을 targetShape로 수정

model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError',
    metrics: ['mae'],
});

model.summary();

async function trainModel() {
    const { features, labels } = await loadData();

    await model.fit(features, labels, {
        epochs: 20, 
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: false, 
    });

}
