"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[9116],{57052:(e,a,n)=>{n.r(a),n.d(a,{assets:()=>s,contentTitle:()=>o,default:()=>l,frontMatter:()=>c,metadata:()=>d,toc:()=>i});var r=n(85893),t=n(11151);const c={id:"dataSources.MakeLangChainDocumentLoaderDataSourceParams",title:"Interface: MakeLangChainDocumentLoaderDataSourceParams",sidebar_label:"dataSources.MakeLangChainDocumentLoaderDataSourceParams",custom_edit_url:null},o=void 0,d={id:"reference/core/interfaces/dataSources.MakeLangChainDocumentLoaderDataSourceParams",title:"Interface: MakeLangChainDocumentLoaderDataSourceParams",description:"dataSources.MakeLangChainDocumentLoaderDataSourceParams",source:"@site/docs/reference/core/interfaces/dataSources.MakeLangChainDocumentLoaderDataSourceParams.md",sourceDirName:"reference/core/interfaces",slug:"/reference/core/interfaces/dataSources.MakeLangChainDocumentLoaderDataSourceParams",permalink:"/chatbot/reference/core/interfaces/dataSources.MakeLangChainDocumentLoaderDataSourceParams",draft:!1,unlisted:!1,editUrl:null,tags:[],version:"current",frontMatter:{id:"dataSources.MakeLangChainDocumentLoaderDataSourceParams",title:"Interface: MakeLangChainDocumentLoaderDataSourceParams",sidebar_label:"dataSources.MakeLangChainDocumentLoaderDataSourceParams",custom_edit_url:null},sidebar:"main",previous:{title:"dataSources.MakeGitDataSourceParams",permalink:"/chatbot/reference/core/interfaces/dataSources.MakeGitDataSourceParams"},next:{title:"dataSources.ProjectBase",permalink:"/chatbot/reference/core/interfaces/dataSources.ProjectBase"}},s={},i=[{value:"Properties",id:"properties",level:2},{value:"documentLoader",id:"documentloader",level:3},{value:"Defined in",id:"defined-in",level:4},{value:"metadata",id:"metadata",level:3},{value:"Defined in",id:"defined-in-1",level:4},{value:"name",id:"name",level:3},{value:"Defined in",id:"defined-in-2",level:4},{value:"Methods",id:"methods",level:2},{value:"transformLangchainDocumentToPage",id:"transformlangchaindocumenttopage",level:3},{value:"Parameters",id:"parameters",level:4},{value:"Returns",id:"returns",level:4},{value:"Defined in",id:"defined-in-3",level:4}];function h(e){const a={a:"a",code:"code",h2:"h2",h3:"h3",h4:"h4",hr:"hr",p:"p",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,t.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(a.p,{children:[(0,r.jsx)(a.a,{href:"/chatbot/reference/core/modules/dataSources",children:"dataSources"}),".MakeLangChainDocumentLoaderDataSourceParams"]}),"\n",(0,r.jsx)(a.h2,{id:"properties",children:"Properties"}),"\n",(0,r.jsx)(a.h3,{id:"documentloader",children:"documentLoader"}),"\n",(0,r.jsxs)(a.p,{children:["\u2022 ",(0,r.jsx)(a.strong,{children:"documentLoader"}),": ",(0,r.jsx)(a.code,{children:"DocumentLoader"})]}),"\n",(0,r.jsxs)(a.p,{children:[(0,r.jsx)(a.a,{href:"https://js.langchain.com/docs/modules/data_connection/document_loaders/",children:"Langchain document loader"})," to use to load documents."]}),"\n",(0,r.jsx)(a.h4,{id:"defined-in",children:"Defined in"}),"\n",(0,r.jsx)(a.p,{children:(0,r.jsx)(a.a,{href:"https://github.com/mongodb/chatbot/blob/009c5855/packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts#L10",children:"packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts:10"})}),"\n",(0,r.jsx)(a.hr,{}),"\n",(0,r.jsx)(a.h3,{id:"metadata",children:"metadata"}),"\n",(0,r.jsxs)(a.p,{children:["\u2022 ",(0,r.jsx)(a.code,{children:"Optional"})," ",(0,r.jsx)(a.strong,{children:"metadata"}),": ",(0,r.jsx)(a.a,{href:"../namespaces/.ContentStore#pagemetadata",children:(0,r.jsx)(a.code,{children:"PageMetadata"})})]}),"\n",(0,r.jsx)(a.p,{children:"Metadata to use in the page metadata of all documents."}),"\n",(0,r.jsxs)(a.p,{children:[(0,r.jsx)(a.code,{children:"Page.metadata"})," generated with ",(0,r.jsx)(a.code,{children:"transformLangchainDocumentToPage()"}),"\noverrides this metadata if the properties have the same key."]}),"\n",(0,r.jsx)(a.h4,{id:"defined-in-1",children:"Defined in"}),"\n",(0,r.jsx)(a.p,{children:(0,r.jsx)(a.a,{href:"https://github.com/mongodb/chatbot/blob/009c5855/packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts#L23",children:"packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts:23"})}),"\n",(0,r.jsx)(a.hr,{}),"\n",(0,r.jsx)(a.h3,{id:"name",children:"name"}),"\n",(0,r.jsxs)(a.p,{children:["\u2022 ",(0,r.jsx)(a.strong,{children:"name"}),": ",(0,r.jsx)(a.code,{children:"string"})]}),"\n",(0,r.jsx)(a.p,{children:"Name of the data source used by MongoDB RAG Ingest."}),"\n",(0,r.jsx)(a.h4,{id:"defined-in-2",children:"Defined in"}),"\n",(0,r.jsx)(a.p,{children:(0,r.jsx)(a.a,{href:"https://github.com/mongodb/chatbot/blob/009c5855/packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts#L15",children:"packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts:15"})}),"\n",(0,r.jsx)(a.h2,{id:"methods",children:"Methods"}),"\n",(0,r.jsx)(a.h3,{id:"transformlangchaindocumenttopage",children:"transformLangchainDocumentToPage"}),"\n",(0,r.jsxs)(a.p,{children:["\u25b8 ",(0,r.jsx)(a.strong,{children:"transformLangchainDocumentToPage"}),"(",(0,r.jsx)(a.code,{children:"doc"}),"): ",(0,r.jsx)(a.code,{children:"Promise"}),"<",(0,r.jsx)(a.code,{children:"Omit"}),"<",(0,r.jsx)(a.a,{href:"../namespaces/.ContentStore#page",children:(0,r.jsx)(a.code,{children:"Page"})}),", ",(0,r.jsx)(a.code,{children:'"sourceName"'}),">>"]}),"\n",(0,r.jsxs)(a.p,{children:["Take the LangchainDocument returned by the ",(0,r.jsx)(a.code,{children:"documentLoader"}),"\nand transform it into the ",(0,r.jsx)(a.a,{href:"../namespaces/.ContentStore#page",children:"Page"})," persisted in the PageStore."]}),"\n",(0,r.jsx)(a.h4,{id:"parameters",children:"Parameters"}),"\n",(0,r.jsxs)(a.table,{children:[(0,r.jsx)(a.thead,{children:(0,r.jsxs)(a.tr,{children:[(0,r.jsx)(a.th,{style:{textAlign:"left"},children:"Name"}),(0,r.jsx)(a.th,{style:{textAlign:"left"},children:"Type"})]})}),(0,r.jsx)(a.tbody,{children:(0,r.jsxs)(a.tr,{children:[(0,r.jsx)(a.td,{style:{textAlign:"left"},children:(0,r.jsx)(a.code,{children:"doc"})}),(0,r.jsxs)(a.td,{style:{textAlign:"left"},children:[(0,r.jsx)(a.code,{children:"Document"}),"<",(0,r.jsx)(a.code,{children:"Record"}),"<",(0,r.jsx)(a.code,{children:"string"}),", ",(0,r.jsx)(a.code,{children:"any"}),">>"]})]})})]}),"\n",(0,r.jsx)(a.h4,{id:"returns",children:"Returns"}),"\n",(0,r.jsxs)(a.p,{children:[(0,r.jsx)(a.code,{children:"Promise"}),"<",(0,r.jsx)(a.code,{children:"Omit"}),"<",(0,r.jsx)(a.a,{href:"../namespaces/.ContentStore#page",children:(0,r.jsx)(a.code,{children:"Page"})}),", ",(0,r.jsx)(a.code,{children:'"sourceName"'}),">>"]}),"\n",(0,r.jsx)(a.h4,{id:"defined-in-3",children:"Defined in"}),"\n",(0,r.jsx)(a.p,{children:(0,r.jsx)(a.a,{href:"https://github.com/mongodb/chatbot/blob/009c5855/packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts#L29",children:"packages/mongodb-rag-core/src/dataSources/LangchainDocumentLoaderDataSource.ts:29"})})]})}function l(e={}){const{wrapper:a}={...(0,t.a)(),...e.components};return a?(0,r.jsx)(a,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},11151:(e,a,n)=>{n.d(a,{Z:()=>d,a:()=>o});var r=n(67294);const t={},c=r.createContext(t);function o(e){const a=r.useContext(c);return r.useMemo((function(){return"function"==typeof e?e(a):{...a,...e}}),[a,e])}function d(e){let a;return a=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:o(e.components),r.createElement(c.Provider,{value:a},e.children)}}}]);