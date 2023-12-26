import React, { Component } from "react";
import { Navbar } from "react-bootstrap";

class TopNav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connectedAddress: "",
    };
  }
  render() {
    return (
      <nav
        className="navbar navbar-expand-lg navbar-light bg-dark"
        style={{
          backgroundImage: `url(./logo.png)`,
          backgroundSize: "cover",
          height: '100px'
        }}
      >
        <div className="container-fluid">
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <Navbar.Brand href="#home">
            </Navbar.Brand>
          </div>
        </div>
      </nav>
    );
  }
}

export default TopNav;
