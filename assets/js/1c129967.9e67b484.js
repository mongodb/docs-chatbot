"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[7597],{58006:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>h,contentTitle:()=>i,default:()=>m,frontMatter:()=>s,metadata:()=>a,toc:()=>c});var o=t(85893),r=t(11151);const s={},i="Chat with an LLM",a={id:"server/llm",title:"Chat with an LLM",description:"This guide contains information on how you can use the MongoDB Chatbot Server",source:"@site/docs/server/llm.md",sourceDirName:"server",slug:"/server/llm",permalink:"/chatbot/server/llm",draft:!1,unlisted:!1,editUrl:"https://github.com/mongodb/chatbot/tree/main/docs/docs/server/llm.md",tags:[],version:"current",frontMatter:{},sidebar:"main",previous:{title:"Generate User Message",permalink:"/chatbot/server/user-message"},next:{title:"Retrieval Augmented Generation (RAG)",permalink:"/chatbot/server/rag/"}},h={},c=[{value:"Configure the <code>ChatLlm</code>",id:"configure-the-chatllm",level:2},{value:"Use OpenAI API",id:"use-openai-api",level:3},{value:"Use Langchain <code>ChatModel</code>",id:"use-langchain-chatmodel",level:3},{value:"Manage Previous Messages Sent to the LLM",id:"manage-previous-messages-sent-to-the-llm",level:2},{value:"Prompt Engineering",id:"prompt-engineering",level:2},{value:"System Prompt",id:"system-prompt",level:3},{value:"User Prompt",id:"user-prompt",level:3}];function l(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,r.a)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.h1,{id:"chat-with-an-llm",children:"Chat with an LLM"}),"\n",(0,o.jsx)(n.p,{children:"This guide contains information on how you can use the MongoDB Chatbot Server\nto chat with a large language model (LLM)."}),"\n",(0,o.jsxs)(n.h2,{id:"configure-the-chatllm",children:["Configure the ",(0,o.jsx)(n.code,{children:"ChatLlm"})]}),"\n",(0,o.jsxs)(n.p,{children:["The ",(0,o.jsx)(n.a,{href:"/chatbot/reference/core/interfaces/Llm.ChatLlm",children:(0,o.jsx)(n.code,{children:"ChatLlm"})})," is the interface\nbetween the chatbot server and the LLM."]}),"\n",(0,o.jsxs)(n.p,{children:["The MongoDB Chatbot Server comes with an implementation of the ",(0,o.jsx)(n.code,{children:"ChatLlm"}),",\nwhich uses the OpenAI API. You could also implement your own ",(0,o.jsx)(n.code,{children:"ChatLlm"})," to\nuse a different language model or different configuration on the OpenAI API."]}),"\n",(0,o.jsx)(n.p,{children:"The following are useful things to keep in mind when using an LLM:"}),"\n",(0,o.jsxs)(n.ol,{children:["\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"What model to use."})," This is probably the single most important decision\nfor shaping the chatbot response. The quality and characteristics\nof different models vary greatly."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"Model temperature."}),' The temperature of the model determines how "creative"\nthe model is. A higher temperature will result in more creative responses,\nbut also more errors.']}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"Model max tokens."})," The maximum number of tokens that the model will generate.\nThis is useful for preventing the model from generating very long responses,\nwhich impacts cost and quality."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"Prompt engineering."})," What additional information to include in the prompt\nto guide the model's behavior. For more information, refer to the\n",(0,o.jsx)(n.a,{href:"#prompt-engineering",children:"Prompt Engineering"})," section."]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.strong,{children:"Tools."})," What tools to give the model to use. For more information, refer to the\n",(0,o.jsx)(n.a,{href:"/chatbot/server/tools",children:"Tool Calling"})," guide."]}),"\n"]}),"\n",(0,o.jsx)(n.h3,{id:"use-openai-api",children:"Use OpenAI API"}),"\n",(0,o.jsxs)(n.p,{children:["You can use the ",(0,o.jsx)(n.a,{href:"/chatbot/reference/core/namespaces/Llm#makeopenaichatllm",children:(0,o.jsx)(n.code,{children:"makeOpenAiChatLlm()"})}),"\nconstructor function to create a ",(0,o.jsx)(n.code,{children:"ChatLlm"})," that uses an OpenAI model like GPT-3.5."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"makeOpenAiChatLlm()"})," supports both the OpenAI API and Azure OpenAI Service.\nIt wraps the ",(0,o.jsx)(n.code,{children:"openai"})," package, which supports both of these services."]}),"\n",(0,o.jsxs)(n.p,{children:["The following is an example implementation of ",(0,o.jsx)(n.code,{children:"makeOpenAiChatLlm()"}),":"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'import { makeOpenAiChatLlm, OpenAiChatMessage } from "mongodb-chatbot-server";\nimport { someTool } from "./someTool";\nexport const openAiClient = new OpenAIClient(\n  OPENAI_ENDPOINT,\n  new AzureKeyCredential(OPENAI_API_KEY)\n);\n\nexport const llm = makeOpenAiChatLlm({\n  openAiClient,\n  deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,\n  openAiLmmConfigOptions: {\n    temperature: 0,\n    maxTokens: 500,\n  },\n  tools: [someTool],\n});\n'})}),"\n",(0,o.jsxs)(n.h3,{id:"use-langchain-chatmodel",children:["Use Langchain ",(0,o.jsx)(n.code,{children:"ChatModel"})]}),"\n",(0,o.jsxs)(n.p,{children:["You can use the ",(0,o.jsx)(n.a,{href:"/chatbot/reference/core/namespaces/Llm#makelangchainchatllm",children:(0,o.jsx)(n.code,{children:"makeLangchainChatLlm()"})})," constructor function to create a ",(0,o.jsx)(n.code,{children:"ChatLlm"})," that uses a Langchain ",(0,o.jsx)(n.code,{children:"ChatModel"}),". For more information on available ",(0,o.jsx)(n.code,{children:"ChatModel"})," implementations, refer to the ",(0,o.jsx)(n.a,{href:"https://js.langchain.com/docs/integrations/chat/",children:"Chat Models"})," in the Langchain documentation."]}),"\n",(0,o.jsxs)(n.p,{children:["The following is an example implementation of using ",(0,o.jsx)(n.code,{children:"makeLangchainChatLlm()"})," to\nuse Anthropic's Claude family of models:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'import { makeLangchainChatLlm } from "mongodb-chatbot-server";\nimport { ChatAnthropic } from "@langchain/anthropic";\n\nconst anthropicModel = new ChatAnthropic({\n  temperature: 0.9,\n  anthropicApiKey: "YOUR-API-KEY",\n  maxTokensToSample: 1024,\n});\nconst anthropicChatLlm = makeLangchainChatLlm({ chatModel: anthropicModel });\n'})}),"\n",(0,o.jsx)(n.h2,{id:"manage-previous-messages-sent-to-the-llm",children:"Manage Previous Messages Sent to the LLM"}),"\n",(0,o.jsxs)(n.p,{children:["The MongoDB Chatbot Server always sends the ",(0,o.jsx)(n.strong,{children:"current"})," user message to the LLM."]}),"\n",(0,o.jsxs)(n.p,{children:["You can also manage which ",(0,o.jsx)(n.strong,{children:"previous"})," messages in a conversation the MongoDB Chatbot Server sends to the LLM on each user message.\nYou might want to do this to allow for appropriate context to be sent to the LLM\nwithout exceeding the maximum number of tokens in the LLM's context window."]}),"\n",(0,o.jsxs)(n.p,{children:["You do this at the ",(0,o.jsx)(n.code,{children:"ConversationRouter"})," level with the ",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/interfaces/ConversationsRouterParams#filterpreviousmessages",children:(0,o.jsx)(n.code,{children:"ConversationsRouterParams.filterPreviousMessages"})})," property.\nThe ",(0,o.jsx)(n.code,{children:"filterPreviousMessages"})," property accepts a ",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/modules#filterpreviousmessages",children:(0,o.jsx)(n.code,{children:"FilterPreviousMessages"})})," function."]}),"\n",(0,o.jsxs)(n.p,{children:["By default, the MongoDB Chatbot Server only send the initial system prompt\nand the user's current message to the LLM. You can change this behavior by\nimplementing your own ",(0,o.jsx)(n.code,{children:"FilterPreviousMessages"})," function."]}),"\n",(0,o.jsxs)(n.p,{children:["The MongoDB Chatbot Server package also comes with a ",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/modules#makefilternpreviousmessages",children:(0,o.jsx)(n.code,{children:"makeFilterNPreviousMessages"})}),"\nconstructor function. ",(0,o.jsx)(n.code,{children:"makeFilterNPreviousMessages"}),"\ncreates a ",(0,o.jsx)(n.code,{children:"FilterPreviousMessages"})," function that returns the previous ",(0,o.jsx)(n.code,{children:"n"})," messages\nplus the initial system prompt."]}),"\n",(0,o.jsxs)(n.p,{children:["The following is an example implementation of ",(0,o.jsx)(n.code,{children:"makeFilterNPreviousMessages()"}),":"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'import {\n  makeFilterNPreviousMessages,\n  ConversationsRouterParams,\n  AppConfig,\n} from "mongodb-chatbot-server";\n\nconst filter10PreviousMessages = makeFilterNPreviousMessages(10);\n\nconst conversationsRouterConfig: ConversationsRouterParams = {\n  filterPreviousMessages: filter10PreviousMessages,\n  ...otherConfig,\n};\nconst appConfig: AppConfig = {\n  conversationsRouterConfig,\n  ...otherConfig,\n};\n'})}),"\n",(0,o.jsx)(n.h2,{id:"prompt-engineering",children:"Prompt Engineering"}),"\n",(0,o.jsx)(n.p,{children:"Prompt engineering is the process of directing the output of a language model\nto produce a desired response."}),"\n",(0,o.jsx)(n.p,{children:"In the context of a chatbot server such as this, there are the following main areas\nfor prompt engineering:"}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsx)(n.li,{children:"System prompt: Message at the beginning of the conversation that guides the\nchatbot's behavior when generating responses."}),"\n",(0,o.jsx)(n.li,{children:"User prompt: User message that the chatbot uses to generate a response.\nIn RAG applications, this can include adding relevant content gathered from\nvector search results based on the user's input."}),"\n"]}),"\n",(0,o.jsx)(n.p,{children:"This guide does not cover prompt engineering techniques, but rather where you\ncan apply them in the MongoDB Chatbot Server."}),"\n",(0,o.jsxs)(n.p,{children:["Prompt engineering is a fairly new field, and best practices are still emerging.\nA great resource to learn more about prompt engineering is the ",(0,o.jsx)(n.a,{href:"https://www.promptingguide.ai/",children:"Prompt Engineering Guide"}),"."]}),"\n",(0,o.jsx)(n.h3,{id:"system-prompt",children:"System Prompt"}),"\n",(0,o.jsxs)(n.p,{children:["To add a system prompt, include a ",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/modules#systemprompt",children:(0,o.jsx)(n.code,{children:"SystemPrompt"})})," message in your app's ",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/interfaces/ConversationsRouterParams#systemprompt",children:(0,o.jsx)(n.code,{children:"ConversationsRouterParams.systemPrompt"})}),"."]}),"\n",(0,o.jsx)(n.p,{children:"The system prompt is one of the most powerful way to customize the way\nthat the chatbot responds to users. You can use the system prompt to do things\nsuch as:"}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsx)(n.li,{children:"Control the style and personality of the chatbot."}),"\n",(0,o.jsx)(n.li,{children:"Determine how the chatbot responds to certain types of questions."}),"\n",(0,o.jsx)(n.li,{children:"Direct how the chatbot interprets user input and context information."}),"\n"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'import {\n  SystemPrompt,\n  ConversationsRouterParams,\n} from "mongodb-chatbot-server";\nimport { MongoClient } from "mongodb-rag-core/mongodb";\n\n// System prompt for chatbot\nconst systemPrompt: SystemPrompt = {\n  role: "system",\n  content: `You are an assistant to users of the MongoDB Chatbot Framework.\nAnswer their questions about the framework in a friendly conversational tone.\nFormat your answers in Markdown.\nBe concise in your answers.\nIf you do not know the answer to the question based on the information provided,\nrespond: "I\'m sorry, I don\'t know the answer to that question. Please try to rephrase it. Refer to the below information to see if it helps."`,\n};\n\nconst conversationsRouterConfig: ConversationsRouterParams = {\n  // ...other config\n  systemPrompt,\n};\n'})}),"\n",(0,o.jsx)(n.h3,{id:"user-prompt",children:"User Prompt"}),"\n",(0,o.jsxs)(n.p,{children:["You can modify what the chatbot uses as the user prompt by implementing the\n",(0,o.jsx)(n.a,{href:"/chatbot/reference/server/modules#generateuserpromptfunc",children:(0,o.jsx)(n.code,{children:"GenerateUserPromptFunc"})})," function."]}),"\n",(0,o.jsxs)(n.p,{children:[(0,o.jsx)(n.code,{children:"GenerateUserPromptFunc"})," takes in the user's query and previous messages in the conversation, then returns a new user message. For an overview of the ",(0,o.jsx)(n.code,{children:"GenerateUserPromptFunc"})," function, refer to the ",(0,o.jsx)(n.a,{href:"/chatbot/server/user-message",children:"Generate User Message"})," guide."]}),"\n",(0,o.jsxs)(n.p,{children:["You might want to modify the user prompt if you're using a prompting technique\nlike retrieval augmented generation (RAG) or chain of thought.\nTo learn more about using RAG with the MongoDB Chatbot Server, refer to the\n",(0,o.jsx)(n.a,{href:"/chatbot/server/rag/",children:"RAG"})," guide."]})]})}function m(e={}){const{wrapper:n}={...(0,r.a)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(l,{...e})}):l(e)}},11151:(e,n,t)=>{t.d(n,{Z:()=>a,a:()=>i});var o=t(67294);const r={},s=o.createContext(r);function i(e){const n=o.useContext(s);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:i(e.components),o.createElement(s.Provider,{value:n},e.children)}}}]);