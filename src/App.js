import './App.css';
import React, { Component } from 'react'
import { API, Auth, graphqlOperation } from 'aws-amplify'
import { withAuthenticator } from 'aws-amplify-react'
import { createTodo, deleteTodo, updateTodo } from './graphql/mutations'
import { listTodos } from './graphql/queries'
import {onCreateTodo, onDeleteTodo, onUpdateTodo} from './graphql/subscriptions'

class App extends Component {

  state = {
    id: "",
    name: "",
    notes:[]
  };

  async componentDidMount() {
    this.getNotes();
    this.createNoteListener = API.graphql(graphqlOperation(onCreateTodo,
        {
          owner: (await Auth.currentUserInfo()).username
        })).subscribe({
      next: todoData => {
        const newTodo = todoData.value.data.onCreateTodo;
        const prevTodos = this.state.notes.filter(todo => todo.id !== newTodo.id);
        const updatedTodos = [...prevTodos, newTodo];
        this.setState({notes: updatedTodos});
      }
    });

    this.deleteNoteListener = API.graphql(graphqlOperation(onDeleteTodo,
        {
          owner: (await Auth.currentUserInfo()).username
        })).subscribe({
      next: todoData => {
        const deletedTodo = todoData.value.data.onDeleteTodo;
        const updatedTodos = this.state.notes.filter( todo => todo.id !== deletedTodo.id);
        this.setState({notes: updatedTodos});
      }
    });

    this.updateNoteListener = API.graphql(graphqlOperation(onUpdateTodo,
        {
          owner: (await Auth.currentUserInfo()).username
        })).subscribe({
      next: todoData => {
        const todos = this.state.notes;
        const updatedTodo = todoData.value.data.onUpdateTodo;
        const index = todos.findIndex(todo => todo.id === updatedTodo.id);
        const updatedTodos = [
          ...todos.slice(0, index),
          updatedTodo,
          ...todos.slice(index + 1)
        ];
        this.setState({ notes: updatedTodos, name: "", id: ""});
      }
    })
  }

  componentWillUnmount() {
    this.createNoteListener.unsubscribe();
    this.deleteNoteListener.unsubscribe();
    this.updateNoteListener.unsubscribe();
  }

  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listTodos))
    this.setState({ notes: result.data.listTodos.items})
  };

  handleChangeNote = event => this.setState({ name: event.target.value });

  hasExistingNote = () => {
    const { notes, id } = this.state;
    if(id) {
      const isNote = notes.findIndex(note => note.id === id) > -1
      return isNote;
    }
    return false;
  }

  handleUpdateNote = async () => {
    const {id, name} = this.state;
    const input = {id, name};
    await API.graphql(graphqlOperation(updateTodo, { input }))

  }

  handleAddNote = async event => {
    const { name } = this.state;
    event.preventDefault();
    if(this.hasExistingNote()){
      this.handleUpdateNote()
    } else{
      const input = {
        name: name
      }
      await API.graphql(graphqlOperation(createTodo, { input }))
      this.setState({name:""});
    }
  }

  handleDeleteNote = async noteId => {
    const input = {id: noteId};
    await API.graphql(graphqlOperation(deleteTodo, { input }));
  }

  handleSetNote =  ({name, id}) =>{
    this.setState({ name, id })
  }

  render() {
    const { notes, name } = this.state;
    return (
        <div className="flex flex-column
    items-center justify-center pa3
    bg-washed-red">
          <h1 className="code f2-1">Amplify Notetaker</h1>
          <form className="mb3" onSubmit={this.handleAddNote}>
            <input type="text" className="pa2 f4"
                   placeholder="Your Note"
                   onChange={this.handleChangeNote}
                   value={name}
            />
            <button className="pa2 f4" type="submit">
              Add Note
            </button>
          </form>
          <div>
            {notes.map(item => (
                <div key={item.id}
                className="flex items-center">
                  <li onClick={() => this.handleSetNote(item)} className="list pa1 f3" >
                    {item.name}
                  </li>
                  <button className="bg-transparent bn f4" onClick={() => this.handleDeleteNote(item.id)}>
                    <span>&times;</span>
                  </button>
                </div>
            ))}
          </div>
        </div>
    );
  }
}
export default withAuthenticator(App, { includeGreetings: true});
