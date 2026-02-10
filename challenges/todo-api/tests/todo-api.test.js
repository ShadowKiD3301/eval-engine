const request = require('supertest');

let app;

function expectTodoShape(todo) {
  expect(todo).toHaveProperty('id');
  expect(typeof todo.id).toBe('number');

  expect(todo).toHaveProperty('title');
  expect(typeof todo.title).toBe('string');

  expect(todo).toHaveProperty('completed');
  expect(typeof todo.completed).toBe('boolean');
}

describe('TODO API Challenge', () => {
  beforeAll(() => {
    // The runner ensures tests are placed under /workspace/challenge/tests,
    // so ../../src/app resolves to /workspace/src/app.
    app = require('../../src/app');
  });

  test('GET /todos returns an array (initially empty)', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('POST /todos rejects missing title', async () => {
    const res = await request(app).post('/todos').send({});
    expect(res.status).toBe(400);
  });

  test('POST /todos creates a todo', async () => {
    const res = await request(app).post('/todos').send({ title: 'buy milk' });
    expect(res.status).toBe(201);
    expectTodoShape(res.body);
    expect(res.body.title).toBe('buy milk');
    expect(res.body.completed).toBe(false);
  });

  test('GET /todos returns created todos', async () => {
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expectTodoShape(res.body[0]);
  });

  test('GET /todos/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/todos/99999');
    expect(res.status).toBe(404);
  });

  test('GET /todos/:id returns the todo', async () => {
    const list = await request(app).get('/todos');
    const id = list.body[0].id;

    const res = await request(app).get(`/todos/${id}`);
    expect(res.status).toBe(200);
    expectTodoShape(res.body);
    expect(res.body.id).toBe(id);
  });

  test('PATCH /todos/:id updates completed flag', async () => {
    const list = await request(app).get('/todos');
    const id = list.body[0].id;

    const res = await request(app).patch(`/todos/${id}`).send({ completed: true });
    expect(res.status).toBe(200);
    expectTodoShape(res.body);
    expect(res.body.completed).toBe(true);
  });

  test('PATCH /todos/:id returns 404 for unknown id', async () => {
    const res = await request(app).patch('/todos/99999').send({ completed: true });
    expect(res.status).toBe(404);
  });

  test('DELETE /todos/:id deletes and returns 204', async () => {
    // create a new todo so we can delete it
    const created = await request(app).post('/todos').send({ title: 'to delete' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const del = await request(app).delete(`/todos/${id}`);
    expect(del.status).toBe(204);

    const res = await request(app).get(`/todos/${id}`);
    expect(res.status).toBe(404);
  });
});
