import React, { useState } from "react";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import ShortTextIcon from "@material-ui/icons/ShortText";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";

import TableRow from "@material-ui/core/TableRow";

import axios from "axios";
import { Table, TableHead } from "@material-ui/core";

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {"Copyright © "}
      <Link color="inherit" href="https://google.com/">
        TinyBCurl
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const useStyles = makeStyles(theme => ({
  "@global": {
    body: {
      backgroundColor: theme.palette.common.white
    }
  },
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1)
  },
  submit: {
    margin: theme.spacing(3, 0, 2)
  }
}));

export default function SignIn() {
  const classes = useStyles();

  const [formData, setFormData] = useState({
    longUrl: "http://"
  });

  const [redirects, setRedirects] = useState([]);

  const onClickShorten = async e => {
    e.preventDefault();
    console.log(formData);
    const data = await axios.post("/transaction/broadcast", formData);
    // console.log(data.data.newTransaction);
    setRedirects([...redirects, data.data.newTransaction]);
  };

  const onMineClick = async e => {
    e.preventDefault();
    const data = await axios.get("/mine");
    console.log(data.data.note);
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <ShortTextIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          URL Shortner on Blockchain
        </Typography>
        <form onSubmit={onClickShorten} className={classes.form} noValidate>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="longUrl"
            label="Long Url"
            name="longUrl"
            autoComplete="url"
            onChange={e => setFormData({ longUrl: e.target.value })}
            value={formData.longUrl}
            autoFocus
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Shorten This Url
          </Button>
          <Grid container>
            <Grid item>
              <Link onClick={onMineClick} href="#" variant="body2">
                {"MINE"}
              </Link>
            </Grid>
          </Grid>
        </form>
        <Typography component="h2" variant="h6" color="primary" gutterBottom>
          Recent Orders
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Long Url</TableCell>
              <TableCell>Short Url</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {redirects.map(redirect => {
              return (
                <TableRow key={redirect.transactionId}>
                  <TableCell>{redirect.longUrl}</TableCell>
                  <TableCell>{redirect.shortUrl}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Box mt={8}>
        <Copyright />
      </Box>
    </Container>
  );
}
