import { inngest } from "@/lib/inngest/client";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts";
import { sendWelcomeEmail } from "@/lib/nodemailer";
import { getAllUserForNewsEmail } from "../actions/user.actions";

export const sendSignUpEmail = inngest.createFunction(
    {id : 'sign-up-email'},
    {event : 'app/user.created'},
    async({event, step}) => {
        const userProfile = `
        -Country : ${event.data.country}
        -Investment goals : ${event.data.investmentGoals}
        -Risk tolerance : ${event.data.riskTolerance}
        -Preferred Industry : ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile);

        const response = await step.ai.infer('generate-welcome-intro', {
            model : step.ai.models.gemini({model: 'gemini-2.5-flash-lite'}), 
            body : {
                contents : [
                    {
                        role: 'user',
                        parts: [
                            {text : prompt}
                        ]
                    }
                ]
            }
            }
        )

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part  ? part.text : null) || 'Thanks for joining Signalist. You now have the tools to track the market and make smarter moves.'

            const {data : {email, name}} = event;
            return await sendWelcomeEmail({ email, name, intro : introText })
        })

        return {
            success : true,
            message : 'Welcome Email sent Successfully',
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    {id : 'send-daily-news-summary'},
    [{event : 'app/send.daily.news'}, {cron : '0 12  * * *'}],
    async ({step}) => {
        //Step 1 : To get all user for news delivery

        const users = await step.run('get-all-users', getAllUserForNewsEmail);

        if(!users || users.length === 0) return {success: false, message : 'No user found for news email'}

        //Step 2 : Fetch personalised news for each user
        //Step 3 : Summarize this news via AI for eahc user
        //Step 4 : Send Emails
    }
)