$(document).ready(function () {
    const apiKey = "64edd4b9daa8d34e8f34965fed3faf75"; // OpenWeather API 키 입력
    const weatherApiUrl = "https://api.openweathermap.org/data/2.5/weather";
    const airPollutionApiUrl = "https://api.openweathermap.org/data/2.5/air_pollution";

    let chart; // Chart.js 인스턴스 선언

    $("#weather-form").on("submit", function (event) {
        event.preventDefault();

        const city = $("#city").val();
        if (!city) return;

        // 1. Weather 데이터 요청
        $.ajax({
            url: weatherApiUrl,
            method: "GET",
            data: {
                q: city,
                appid: apiKey,
                units: "metric"
            },
            success: function (data) {
                const weather = `
                    <h2>Weather in ${data.name}</h2>
                    <p>Temperature: ${data.main.temp}°C</p>
                    <p>Weather: ${data.weather[0].description}</p>
                    <p>Humidity: ${data.main.humidity}%</p>
                    <p>Wind Speed: ${data.wind.speed} m/s</p>
                `;
                $("#weather-result").html(weather);

                const lat = data.coord.lat;
                const lon = data.coord.lon;

                // 2. Air Pollution 데이터 요청
                $.ajax({
                    url: airPollutionApiUrl,
                    method: "GET",
                    data: {
                        lat: lat,
                        lon: lon,
                        appid: apiKey
                    },
                    success: function (pollutionData) {
                        const aqi = pollutionData.list[0].main.aqi;
                        const components = pollutionData.list[0].components;

                        const airPollution = `
                            <h2>Air Pollution</h2>
                            <p>AQI (Air Quality Index): ${aqi} (${getAqiDescription(aqi)})</p>
                            <p>CO: ${components.co} µg/m³</p>
                            <p>NO: ${components.no} µg/m³</p>
                            <p>NO₂: ${components.no2} µg/m³</p>
                            <p>O₃: ${components.o3} µg/m³</p>
                            <p>PM₂.₅: ${components.pm2_5} µg/m³</p>
                            <p>PM₁₀: ${components.pm10} µg/m³</p>
                            <p>SO₂: ${components.so2} µg/m³</p>
                        `;
                        $("#air-pollution-result").html(airPollution);

                        // 3. Chart.js 데이터 업데이트
                        const labels = ["CO", "NO", "NO₂", "O₃", "PM₂.₅", "PM₁₀", "SO₂"];
                        const data = [
                            components.co,
                            components.no,
                            components.no2,
                            components.o3,
                            components.pm2_5,
                            components.pm10,
                            components.so2
                        ];

                        // Chart.js 그래프 생성 또는 업데이트
                        if (chart) {
                            chart.data.datasets[0].data = data; // 데이터 업데이트
                            chart.update(); // 그래프 업데이트
                        } else {
                            chart = new Chart(document.getElementById("myChart"), {
                                type: "bar",
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        label: "Air Pollution Levels (µg/m³)",
                                        data: data,
                                        backgroundColor: [
                                            "rgba(255, 99, 132, 0.6)",
                                            "rgba(54, 162, 235, 0.6)",
                                            "rgba(255, 206, 86, 0.6)",
                                            "rgba(75, 192, 192, 0.6)",
                                            "rgba(153, 102, 255, 0.6)",
                                            "rgba(255, 159, 64, 0.6)",
                                            "rgba(201, 203, 207, 0.6)"
                                        ],
                                        borderColor: [
                                            "rgba(255, 99, 132, 1)",
                                            "rgba(54, 162, 235, 1)",
                                            "rgba(255, 206, 86, 1)",
                                            "rgba(75, 192, 192, 1)",
                                            "rgba(153, 102, 255, 1)",
                                            "rgba(255, 159, 64, 1)",
                                            "rgba(201, 203, 207, 1)"
                                        ],
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: "top",
                                        },
                                        title: {
                                            display: true,
                                            text: "Air Pollution Levels"
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true
                                        }
                                    }
                                }
                            });
                        }
                    },
                    error: function () {
                        $("#air-pollution-result").html("<p>Unable to retrieve air pollution data.</p>");
                    }
                });
            },
            error: function () {
                $("#weather-result").html("<p>Unable to retrieve weather data. Please check the city name and try again.</p>");
                $("#air-pollution-result").html("");
            }
        });
    });

    function getAqiDescription(aqi) {
        switch (aqi) {
            case 1: return "Good";
            case 2: return "Fair";
            case 3: return "Moderate";
            case 4: return "Poor";
            case 5: return "Very Poor";
            default: return "Unknown";
        }
    }
});
