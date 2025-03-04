import "./App.css";
import Chatbot, {
  FloatingActionButtonTrigger,
  InputBarTrigger,
  ModalView,
} from "mongodb-chatbot-ui";

function MyApp() {
  // TODO: add prompts relevant to your repo here
  const suggestedPrompts = [
    "How do I migrate from Oracle forms to react?"
  ];
  return (
    <div>
      <Chatbot darkMode={true} serverBaseUrl="http://localhost:3000/api/v1">
        <>
          <InputBarTrigger suggestedPrompts={suggestedPrompts} />
          <FloatingActionButtonTrigger text="My MongoDB AI" />
          <ModalView
            initialMessageText="Welcome to MongoDB AI Assistant. What can I help you with?"
            initialMessageSuggestedPrompts={suggestedPrompts}
          />
        </>
      </Chatbot>
    </div>
  );
}

export default MyApp;
