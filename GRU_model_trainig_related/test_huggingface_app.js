$(document).ready(function () {
    const apiKey = "API_KEY";
    const apiUrl = "https://api-inference.huggingface.co/models/openai-community/gpt2";

    $("#send-btn").on("click", function () {
        const userInput = $("#user-input").val();
        if (!userInput) {
            alert("Please enter some text.");
            return;
        }

        // API 요청 데이터
        const data = JSON.stringify({
            inputs: userInput,
            options: { wait_for_model: true }
        });

        // AJAX를 사용한 API 호출
        $.ajax({
            url: apiUrl,
            type: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            data: data,
            success: function (response) {
                const generatedText = response[0].generated_text;
                $("#response").html(`<strong>Response:</strong> ${generatedText}`);
            },
            error: function (xhr, status, error) {
                console.error("Error:", status, error);
                $("#response").html(`<strong>Error:</strong> Unable to generate response.`);
            }
        });
    });
});