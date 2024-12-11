// This js file is made for load gru model for prediction and predict next 7 days.
// Failed to convert tensorflow model to js file, I just plotted the air pollution graph for 7 days.

$(document).ready(function () {

    // Settings for openweather api
    const apiKey = "64edd4b9daa8d34e8f34965fed3faf75";
    const airPollutionHistoryApiUrl = "https://api.openweathermap.org/data/2.5/air_pollution/history";
    const charts = {};

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

                pollutants = fetch30DaysData(lat, lon);

                weather = {
                    city_name: data.name,
                    temp: (data.main.temp - 273.15).toPrecision(3),
                    humidity: data.main.humidity,
                    pressure: data.main.pressure,
                    weather: data.weather[0]['main'],
                    wind_deg: data.wind.deg,
                    wind_speed: data.wind.speed
                }



            },
            error: function () {
                alert("City not found! Please check your input.");
            }
        });
    });

    function updateIndividualCharts(labels, pollutants) {
        Object.keys(pollutants).forEach((key) => {
            const chartId = `${key}Chart`;

            const today = new Date().toISOString().split("T")[0];
            const todayIndex = labels.indexOf(today); 

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
                                text: `${key.toUpperCase()} Prediction for next 7 days`
                            },
                            
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



    function fetch30DaysData(lat, lon) {
        const today = Math.floor(new Date().getTime() / 1000);
        // To just show the main function, request 7 days.
        const thirtyDaysAgo = today - 7 * 24 * 60 * 60;

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

                return pollutants;

            },
            error: function () {
                alert("Unable to fetch 30-day air pollution data.");
            }
        });
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


})
