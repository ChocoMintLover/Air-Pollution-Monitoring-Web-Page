$(document).ready(function () {

    // Settings for openweather api
    const apiKey = "64edd4b9daa8d34e8f34965fed3faf75";
    const airPollutionHistoryApiUrl = "https://api.openweathermap.org/data/2.5/air_pollution/history";
    const currentAirPollutionApiUrl = "https://api.openweathermap.org/data/2.5/air_pollution";

    // Settings for Huggingface

    const huggingface_apiKey = "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"; // Hugging Face API 키를 여기에 입력하세요.
    const model_api_url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct";


    // charts contain pollutants data
    const charts = {}; 
    let doughnutChart; 
    let air_30_days_header;

    $("#weather-form").on("submit", function (event) {
        event.preventDefault();
        $('.search-bar').removeClass('search-bar-active');

        console.log($("#response"));

        const city = $("#city").val().trim();
        if (!city) return;

        $.ajax({
            url: `https://api.openweathermap.org/data/2.5/weather`,
            method: "GET",
            data: {
                q: city,
                appid: apiKey
            },
            success: function (data) {
                const lat = data.coord.lat;
                const lon = data.coord.lon;

                fetch30DaysData(lat, lon);

                weather = {
                    city_name: data.name,
                    temp: (data.main.temp - 273.15).toPrecision(3),
                    humidity: data.main.humidity,
                    pressure: data.main.pressure,
                    weather: data.weather[0]['main'],
                    wind_deg: data.wind.deg,
                    wind_speed: data.wind.speed
                }
                fetchTodayData(lat, lon, weather);
            },
            error: function () {
                alert("City not found! Please check your input.");
            }
        });
    });

    function fetch30DaysData(lat, lon) {
        const today = Math.floor(new Date().getTime() / 1000); 
        const thirtyDaysAgo = today - 30 * 24 * 60 * 60; 

        $.ajax({
            url: airPollutionHistoryApiUrl,
            method: "GET",
            data: {
                lat: lat,
                lon: lon,
                start: thirtyDaysAgo,
                end: today,
                appid: apiKey
            },
            success: function (data) {
                const labels = [];
                const pollutants = {
                    co: [],
                    nh3: [],
                    no: [],
                    no2: [],
                    o3: [],
                    pm2_5: [],
                    pm10: [],
                    so2: []
                };

                data.list.forEach((entry) => {
                    const date = new Date(entry.dt * 1000).toISOString().split("T")[0]; // 날짜 추출
                    if (!labels.includes(date)) {
                        labels.push(date);
                    }

                    pollutants.co.push(entry.components.co || 0);
                    pollutants.no.push(entry.components.no || 0);
                    pollutants.no2.push(entry.components.no2 || 0);
                    pollutants.o3.push(entry.components.o3 || 0);
                    pollutants.pm2_5.push(entry.components.pm2_5 || 0);
                    pollutants.pm10.push(entry.components.pm10 || 0);
                    pollutants.so2.push(entry.components.so2 || 0);
                    pollutants.nh3.push(entry.components.nh3 || 0); // NH3 추가
                });

                updateIndividualCharts(labels, pollutants);
            },
            error: function () {
                alert("Unable to fetch 30-day air pollution data.");
            }
        });
    }

    function fetchTodayData(lat, lon, weather) {

        $.ajax({
            url: currentAirPollutionApiUrl,
            method: "GET",
            data: {
                lat: lat,
                lon: lon,
                appid: apiKey
            },
            success: function (data) {
                if (data.list && data.list.length > 0) {
                    const latestEntry = data.list[data.list.length - 1].components;

                    // Update table
                    updateAirconditionTable(latestEntry, weather);

                    // send chatbot about today's weather
                    updateTodaysAdvice(latestEntry, weather);
                } else {
                    alert("No air pollution data available for today.");
                }
            },
            error: function () {
                alert("Unable to fetch today's air pollution data.");
            }
        });
    }

    function updateTodaysAdvice(air_components, weather) {

        // categorized inputs for making prompt
        const input = {
            temp: weather.temp,
            weather_today: weather.weather,
            wind_speed: weather.wind_speed,
            humidity: weather.humidity,
            // Air pollution
            air_quality: {
                pm2_5: air_components.pm2_5,
                o3: air_components.o3,
                pm10: air_components.pm10,
                so2: air_components.so2
            }
        }

        // prompt for accurate answer
        const prompt = `
        Today's weather information:
        - Temperature: ${input.temp}°C
        - Weather: ${input.weather_today}
        - Humidity: ${input.humidity}%
        - Air Quality:
          - PM2.5: ${input.air_quality.pm2_5} µg/m³
          - Ozone: ${input.air_quality.o3} ppb
          - Sulfur Dioxide (SO₂): ${input.air_quality.so2} µg/m³
        Based on this weather data, provide precautions briefly without my prompt.
        Please, only give me text. not markdown except new line(<br>).
        `;


        const data = JSON.stringify({
            inputs: prompt,
            options: {
                wait_for_model: true,
                max_new_tokens: 300,
                return_full_text: false
            }
        });

        $.ajax({
            url: model_api_url,
            type: "POST",
            headers: {
                "Authorization": `Bearer ${huggingface_apiKey}`,
                "Content-Type": "application/json"
            },
            data: data,
            success: function (response) {

                const generated_text = response[0].generated_text;
                // process the response from chatbot
                let end_idx;
                for (let i = generated_text.length - 1; i >= 0; i--) {
                    if (generated_text[i] == '.') {
                        end_idx = i;
                        break;
                    }
                }
                const truncated_text = generated_text.slice(prompt.length, Math.min(end_idx + 1, generated_text.length));
                const processed_text = truncated_text.replace(/\n/g, "<br>").trim();
                $("#response").html(`<strong>Today's Adive by chat AI</strong> ${processed_text}<br><br>Have a nice day!`);

            },
            error: function (xhr, status, error) {
                console.error("Error:", status, error);
                $("#response").html(`<strong>Error:</strong> Unable to generate response.`);
            }
        });
    }


    function updateIndividualCharts(labels, pollutants) {
        Object.keys(pollutants).forEach((key) => {
            const chartId = `${key}Chart`;

            const today = new Date().toISOString().split("T")[0];
            const todayIndex = labels.indexOf(today); // 오늘 날짜의 인덱스 찾기

            // only make charts if they don't exist.
            if (!charts[key]) {
                charts[key] = new Chart(document.getElementById(chartId), {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [{
                            label: `${key.toUpperCase()} Levels`,
                            data: pollutants[key],
                            fill: true,
                            backgroundColor: getBackgroundColor(key, 0.2),
                            borderColor: getBorderColor(key),
                            borderWidth: 2,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: true,
                                labels: {
                                    font: {
                                        size: 14
                                    }
                                }
                            },
                            title: {
                                display: true,
                                text: `${key.toUpperCase()} Levels Over 30 Days`
                            },
                            annotation: { // vertical line to highlight today
                                annotations: todayIndex !== -1 ? {
                                    todayLine: {
                                        type: "line",
                                        xMin: todayIndex, 
                                        xMax: todayIndex,
                                        borderColor: "rgba(213, 166, 242, 0.5)", 
                                        borderWidth: 10,
                                        label: {
                                            content: "Today", 
                                            enabled: true,
                                            backgroundColor: "rgba(255, 99, 132, 0.8)",
                                            font: {
                                                size: 12
                                            },
                                            color: "black"
                                        }
                                    }
                                } : {}
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            } else {
                charts[key].data.labels = labels;
                charts[key].data.datasets[0].data = pollutants[key];
                charts[key].options.plugins.annotation.annotations = todayIndex !== -1 ? {
                    todayLine: {
                        type: "line",
                        xMin: todayIndex,
                        xMax: todayIndex,
                        borderColor: "red",
                        borderWidth: 2,
                        label: {
                            content: "Today",
                            enabled: true,
                            position: "end",
                            backgroundColor: "rgba(255, 99, 132, 0.8)",
                            font: {
                                size: 12
                            },
                            color: "white"
                        }
                    }
                } : {};
                charts[key].update();
            }
        });
    }

    function updateAirconditionTable(components, weather) {
        const container = document.getElementById("aircondition-container");

        container.innerHTML = ""; // Initialize previous informations

        const cityName = document.createElement('div');
        cityName.textContent = weather.city_name;
        cityName.style.fontWeight = 600;
        cityName.style.fontSize = "2rem";

        container.appendChild(cityName);

        // Weather 데이터 섹션
        const weatherSection = document.createElement("div");
        weatherSection.className = "section";

        const weatherTitle = document.createElement("h3");
        weatherTitle.textContent = "Today's Weather Condition";
        container.appendChild(weatherTitle);

        const weather_data = [
            { label: "Temperature", metric: `${weather.temp} °C`, value: weather.temp },
            { label: "Weather", metric: `${weather.weather}`, value: weather.weather },
            { label: "Wind Direction", metric: `${weather.wind_deg}°`, value: weather.wind_deg },
            { label: "Wind Speed", metric: `${weather.wind_speed} m/s`, value: weather.wind_speed },
            { label: "Humidity", metric: `${weather.humidity}%`, value: weather.humidity },
            { label: "Air Pressure", metric: `${weather.pressure} atm`, value: weather.pressure }
        ];

        const weather_to_icon = {
            Clear: "",
            Rain: "",
            Clouds: "",
            Snow: "",

        }

        weather_data.forEach((item) => {
            const box = document.createElement("div");
            box.className = "data-box";

            const title = document.createElement("h4");
            title.textContent = item.label;

            const metric = document.createElement("p");
            metric.textContent = item.metric;

            if (item.label === "Temperature") {
                box.style.backgroundColor = getTemperatureOnValue(item.value, 60);
            }

            box.appendChild(title);
            box.appendChild(metric);
            weatherSection.appendChild(box);
        });

        container.appendChild(weatherSection);


        // Air Pollution 데이터 섹션
        const pollutionSection = document.createElement("div");
        if (document.getElementsByClassName(''))
            pollutionSection.className = "section";

        const pollutionTitle = document.createElement("h3");
        pollutionTitle.textContent = "Today's Air Condition";
        container.appendChild(pollutionTitle);

        const pollution_data = [
            { label: "CO", metric: `${components.co} µg/m³`, value: components.co, max: 10000 },
            { label: "NO", metric: `${components.no} µg/m³`, value: components.no, max: 200 },
            { label: "NH₃", metric: `${components.nh3} µg/m³`, value: components.nh3, max: 150 },
            { label: "PM₂.₅", metric: `${components.pm2_5} µg/m³`, value: components.pm2_5, max: 15 },
            { label: "PM₁₀", metric: `${components.pm10} µg/m³`, value: components.pm10, max: 45 },
            { label: "O₃", metric: `${components.o3} µg/m³`, value: components.o3, max: 100 },
            { label: "SO₂", metric: `${components.so2} µg/m³`, value: components.so2, max: 40 }
        ];


        pollution_data.forEach((item) => {
            const box = document.createElement("div");
            box.className = "data-box";

            const title = document.createElement("h4");
            title.textContent = item.label;

            const metric = document.createElement("p");
            metric.textContent = item.metric;

            box.appendChild(title);
            box.appendChild(metric);
            box.style.backgroundColor = getColorBasedOnValue(item.value, item.max);
            pollutionSection.appendChild(box);
        });

        container.appendChild(pollutionSection);

        updateDoughnutChart(components);


    }


    function updateDoughnutChart(components) {
        const container = document.getElementById("chart-graph");

        if (!air_30_days_header) {
            air_30_days_header = document.createElement('div');
            air_30_days_header.textContent = "Air Pollution Over 30 days";
            air_30_days_header.style = "font-size: 2rem; font-weight: 600";
            container.prepend(air_30_days_header);
        }



        const labels = ["CO", "NO", "NO₂", "O₃", "PM₂.₅", "PM₁₀", "SO₂", "NH₃"];
        const keys = ["co", "no", "no2", "o3", "pm2_5", "pm10", "so2", "nh3"];
        const data = [
            components.co,
            components.nh3,
            components.no,
            components.no2,
            components.o3,
            components.pm2_5,
            components.pm10,
            components.so2
        ];

        const backgroundColors = [];
        const borderColors = [];

        keys.forEach((item) => {
            borderColors.push(getBorderColor(item));
            backgroundColors.push(getBackgroundColor(item));
        })


        if (doughnutChart) {
            doughnutChart.data.labels = labels;
            doughnutChart.data.datasets[0].data = data;
            doughnutChart.update();
        } else {
            doughnutChart = new Chart(document.getElementById("doughnutChart"), {
                type: "doughnut",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Today's Air Pollution Levels",
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "top"
                        },
                        title: {
                            display: true,
                            text: "Today's Air Pollution Levels"
                        }
                    }
                }
            });
            doughnutChart.className = "doughnut-chart";
        }
    }

    function getBackgroundColor(pollutant) {
        const colors = {
            co: "rgba(255, 99, 132, 0.4)",    // 빨간색
            nh3: "rgba(255, 105, 180, 0.4)",   // 핑크색
            no: "rgba(54, 162, 235, 0.4)",     // 파란색
            no2: "rgba(255, 206, 86, 0.4)",    // 노란색
            o3: "rgba(75, 192, 192, 0.4)",     // 청록색
            pm2_5: "rgba(153, 102, 255, 0.4)", // 보라색
            pm10: "rgba(255, 159, 64, 0.4)",   // 주황색
            so2: "rgba(201, 203, 207, 0.4)"    // 회색
        };

        return colors[pollutant] || "rgba(0, 0, 0, 0.6)";  // 기본값 (검은색)
    }

    function getBorderColor(pollutant) {
        const borderColors = {
            co: "rgba(255, 99, 132, 1)",   
            nh3: "rgba(255, 105, 180, 1)",  
            no: "rgba(54, 162, 235, 1)",    
            no2: "rgba(255, 206, 86, 1)",   
            o3: "rgba(75, 192, 192, 1)",    
            pm2_5: "rgba(153, 102, 255, 1)",
            pm10: "rgba(255, 159, 64, 1)",  
            so2: "rgba(201, 203, 207, 1)"   
        };

        return borderColors[pollutant] || "rgba(0, 0, 0, 1)"; 
    }

    function getColorBasedOnValue(value, max) {
        const intensity = Math.min(value / max, 1); 
        const red = Math.floor(255 * intensity);
        const green = Math.floor(255 * (1 - intensity));
        return `rgba(${red * 1.2}, ${green * 0.9}, 60, 0.5)`; 
    }

    function getTemperatureOnValue(value, max) {
        const intensity = Math.min(value / max, 1);
        const red = Math.floor(255 * intensity);
        const blue = Math.floor(255 * (1 - intensity));
        return `rgba(${red * 1.5}, 70, ${blue * 0.7}, 0.4)`;
    }

});
