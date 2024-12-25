export class Neighbor {
  constructor(node, weight) {
    this.node = node;
    this.weight = weight;
  }
}

export class Graph {
  constructor() {
    this.adjacencyList = {};
  }
  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
    }
  }
  addEdge(source, destination, weight) {
    if (!this.adjacencyList[source]) {
      this.addVertex(source);
    }
    if (!this.adjacencyList[destination]) {
      this.addVertex(destination);
    }
    this.adjacencyList[source].push(new Neighbor(destination, weight));
    this.adjacencyList[destination].push(new Neighbor(source, weight));
  }

  shortestDistanceNode = function (distances, visited) {
    // create a default value for shortest
    let shortest = null;

    // for each node in the distances object
    for (let node in distances) {
      // if no node has been assigned to shortest yet
      // or if the current node's distance is smaller than the current shortest
      let currentIsShortest =
        shortest === null || distances[node] < distances[shortest];

      // and if the current node is in the unvisited set
      if (currentIsShortest && !visited.includes(node)) {
        // update shortest to be the current node
        shortest = node;
      }
    }
    return shortest;
  };
  // https://levelup.gitconnected.com/finding-the-shortest-path-in-javascript-dijkstras-algorithm-8d16451eea34
  findShortestPath = function (startNode, endNode) {

    // track distances from the start node using a hash object
    let distances = {};
    distances[endNode] = "Infinity";
    for (let child of this.adjacencyList[startNode]) {
      distances[child.node] = child.weight;
    }
    //distances = Object.assign(distances, this.adjacencyList[startNode]);// track paths using a hash object
    let parents = { endNode: null };
    for (let child of this.adjacencyList[startNode]) {
      parents[child.node] = startNode;
    }

    // collect visited nodes
    let visited = [];// find the nearest node
    let node = this.shortestDistanceNode(distances, visited);
    // for that node:
    while (node) {
      // find its distance from the start node & its child nodes
      let distance = distances[node];
      let children = this.adjacencyList[node];

      // for each of those child nodes:
      for (let child of children) {

        // make sure each child node is not the start node
        if (String(child.node) === String(startNode)) {
          continue;
        } else {
          // save the distance from the start node to the child node
          let newdistance = distance + child.weight;// if there's no recorded distance from the start node to the child node in the distances object
          // or if the recorded distance is shorter than the previously stored distance from the start node to the child node
          if (!distances[child.node] || distances[child.node] > newdistance) {
            // save the distance to the object
            distances[child.node] = newdistance;
            // record the path
            parents[child.node] = node;
          }
        }
      }
      // move the current node to the visited set
      visited.push(node);// move to the nearest neighbor node
      node = this.shortestDistanceNode(distances, visited);
    }

    // using the stored paths from start node to end node
    // record the shortest path
    let shortestPath = [endNode];
    let parent = parents[endNode];
    while (parent) {
      shortestPath.push(parent);
      parent = parents[parent];
    }
    shortestPath.reverse();

    //this is the shortest path
    let results = {
      distance: distances[endNode],
      path: shortestPath,
    };
    // return the shortest path & the end node's distance from the start node
    return results;
  };

//https://www.freecodecamp.org/news/8-essential-graph-algorithms-in-javascript/
traverse = function (start) {
    const queue = [{ node: start, distance: 0 }];
    const result = new Map();
    const visited = {};
    visited[start] = true;
    let currentVertex;
    while (queue.length) {
      currentVertex = queue.shift();
      result.set(currentVertex.node, currentVertex.distance);
      this.adjacencyList[currentVertex.node].forEach(neighbor => {
        if (!visited[neighbor.node]) {
          visited[neighbor.node] = true;
          queue.push({ node: neighbor.node, distance: currentVertex.distance + neighbor.weight });
        }
      });
    }
    return result;
  }

}