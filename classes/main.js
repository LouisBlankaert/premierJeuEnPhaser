let config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade', // nom par défaut
        arcade: {
            gravity: { y: 300 }, // creer la gravité du jeux 
            debug: false 
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game = new Phaser.Game(config);

function preload ()
{
    this.load.image('sky', './assets/sky.png');
    this.load.image('ground', './assets/platform.png');
    this.load.image('star', './assets/star.png');
    this.load.image('bomb', './assets/bomb.png');
    this.load.spritesheet(
        'dude',
        './assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
}

let platforms; // initialiser les platforms
let player; // initaliser le player
let cursors; // initialiser les curseurs
let stars; // initilaiser les étoiles
let score = 0; // initialise le score
let scoreText; // initialise le texte du score
let bombs; // initialise les bombes
let gameOverText; // initialise le gameovertext
let restartButton; // initialise le restart bouton
let gameOver = false // initialise le game over
let jumpCount = 0
let canJump = true

function create ()
{
    // rajout d'un backkground
    this.add.image(400, 300, 'sky');

    // rajouter les platforms
    platforms = this.physics.add.staticGroup(); // va nous permettre de creer plusieurs platforms ?

    platforms.create(400, 568, 'ground').setScale(2).refreshBody(); // setScale pour agrandir la platform et pour refreshBody c'est pour dire au monde physique qu'on a fait des changements sur un objet static
    platforms.create(600, 400, 'ground'); // pour placer les 'ground' sur l'axe X et Y
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // on ajoute le player
    player = this.physics.add.sprite(100, 450, "dude"); // cela crée un sprite appeler 'dude' et sa position, this.physics.add veut dire qu'on crée un corps dynamic
    player.setBounce(0.2); // pour qu'il rebondisse entre 0 et 1, au dessus il bondira de plus en plus fort
    player.setCollideWorldBounds(true); // pour qu'il ne puisse pas traverser l'écran

    player.body.setGravityY(300) // pour appliquer la gravité au joueur

    // pour faire bouger le player et on va rappeler tout ca dans la fonction update()
    this.anims.create({
        key: 'left', // la clé pour une action quand on clique sur la touche de gauche
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), // pour prendre les frames des 4 premieres images
        frameRate: 10, // les images par secondes
        repeat: -1 // pour qu'il fasse un loop des 4 premieres images
    });
    
    this.anims.create({
        key: 'turn', // la clé une action selon la touche 
        frames: [ { key: 'dude', frame: 4 } ], // prend la frame 4 et se met face a l'écran
        frameRate: 20 // les images par secondes
    });
    
    this.anims.create({
        key: 'right', // la clé pour une action quand on clique sur la touche de droite
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), // pour prendre les frames des 4 dernieres images
        frameRate: 10, // les images par secondes
        repeat: -1 // pour qu'il fasse un loop des 4 dernieres images
    });

    // faire en sorte que les objets se cogne quand on les touche, qu'ils ne se traversent pas
    this.physics.add.collider(player, platforms); // entre plateforms et player

    stars = this.physics.add.group({ // rajouter un groupe d'étoiles
        key: 'star', // la clé pour les étoiles
        repeat: 11, // repeter 11x pour qu'on ait 12 étoiles
        setXY: { 
            x: 12, // Positionner la première étoile à 12 pixels sur l'axe X
            y: 0, // Positionner la première étoile à 0 pixels sur l'axe Y (en haut de l'écran)
            stepX: 70 
        } // Espacement horizontal entre chaque étoile, chaque nouvelle étoile sera positionnée 70 pixels plus à droite que la précédente
    });

    stars.children.iterate(function (child) { // Itère sur chaque étoile (chaque "enfant" du groupe d'étoiles)
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0,6)); // Définit un rebond vertical aléatoire pour chaque étoile
    });

    this.physics.add.collider(stars, platforms); // creer la collision entre les étoiles et les platforms

    this.physics.add.overlap(player, stars, collectStar, null, this); // entre player et stars voir si il se overlap

    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' }); // montre le score 0 a l'axe x et y avec la taille de la police et le fill pour les couleures. on peut changer aussi le font

    bombs = this.physics.add.group(); // creer les bombes

    this.physics.add.collider(bombs, platforms); // creer la collision entre les bombes et les platforms

    this.physics.add.collider(
        player, // Premier objet impliqué dans la collision : le joueur
        bombs, // Deuxième objet impliqué dans la collision : le groupe de bombes
        hitBomb, // Fonction de rappel à appeler lorsque la collision se produit
        null, // Fonction de filtrage ou condition de collision (null signifie qu'il n'y a pas de condition supplémentaire)
        this // Contexte dans lequel la fonction de rappel sera exécutée (ici, le contexte de la scène actuelle)
        ); // creer la collision entre le player la bombe, le troisieme parametre permet d'appaler la fonction qu'on a mit en dessous

    // Lancer une bombe dès le démarrage du jeu
    let initialBombX = Phaser.Math.Between(0, 800); // Position x aléatoire pour la première bombe
    let initialBomb = bombs.create(initialBombX, 16, 'bomb'); // Créer la bombe à la position x aléatoire
    initialBomb.setBounce(1); // Définir le rebond de la bombe
    initialBomb.setCollideWorldBounds(true); // Assurer que la bombe ne sort pas des limites du monde
    initialBomb.setVelocity(Phaser.Math.Between(-200, 200), 20); // Définir la vitesse aléatoire de la bombe

    // Crée un texte "Game Over" mais le rend invisible par défaut
    gameOverText = this.add.text(400, 300, 'Game Over', {
        fontSize: '64px',
        fill: '#ff0000'
    }).setOrigin(0.5).setVisible(false); // Positionner au centre et rendre invisible

    // Crée un bouton de redémarrage mais le rend invisible par défaut
    restartButton = this.add.text(400, 400, 'Restart', {
        fontSize: '32px',
        fill: '#00ff00'
    }).setOrigin(0.5).setInteractive().setVisible(false);

    restartButton.on('pointerdown', restartGame, this); // Ajouter un événement clic pour redémarrer le jeu

    cursors = this.input.keyboard.createCursorKeys(); // Crée un objet 'cursors' pour gérer les touches de direction du clavier
}

// fonctions pour faire disparaitre et collecter les étoiles
function collectStar(player, star) { // Cette fonction est appelée lorsque le joueur entre en collision avec une étoile
    star.disableBody(true, true); // Désactive l'étoile (ne peut plus interagir avec d'autres objets) et la rend invisible (ne s'affiche plus)
    
    score += 10; // Ajoute 10 points au score
    scoreText.setText('Score: ' + score); // Met à jour le texte affichant le score avec la nouvelle valeur
    
    if (stars.countActive(true) === 0) { // Vérifie s'il n'y a plus d'étoiles actives (c'est-à-dire, toutes les étoiles ont été ramassées)
        stars.children.iterate(function (child) { // Itère sur chaque enfant du groupe d'étoiles
            child.enableBody(true, child.x, 0, true, true); // Réactive chaque étoile, la positionne à sa position d'origine (x, 0) et la rend visible
        });

        // Détermine la position x pour une nouvelle bombe en fonction de la position du joueur
        let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        // Crée une nouvelle bombe à la position déterminée
        let bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1); // Définit le rebond de la bombe à 1 (rebond total)
        bomb.setCollideWorldBounds(true); // Assure que la bombe ne sort pas des limites du monde
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20); // Donne une vitesse aléatoire à la bombe sur l'axe X et une vitesse fixe sur l'axe Y
    }
}

function hitBomb(player, bomb) {
    this.physics.pause(); // Arrête les simulations physiques
    player.setTint(0xff0000); // Change la couleur du joueur en rouge
    player.anims.play('turn'); // Joue l'animation 'turn'
    gameOver = true; // Marque le jeu comme terminé
    gameOverText.setVisible(true); // Affiche le texte "Game Over"
    restartButton.setVisible(true); // Affiche le bouton de redémarrage
}

function restartGame() {
    this.scene.restart(); // Redémarre la scène actuelle
    gameOver = false; // Réinitialise l'état de fin de jeu
    gameOverText.setVisible(false); // Masque le texte "Game Over"
    restartButton.setVisible(false); // Masque le bouton de redémarrage
    // Réinitialise le score à 0
    score = 0;
    jumpCount = 0
}



// pour gerer les mouvements dans le jeu
function update ()
{
    // Gérer les mouvements gauche et droite
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

   // Réinitialiser le compteur de sauts lorsque le joueur touche le sol
   if (player.body.touching.down) {
    jumpCount = 0;
    canJump = true; // Permet au joueur de sauter à nouveau
    }

    if (cursors.up.isDown && canJump) { // Premier 'if': Vérifie si la touche de saut est enfoncée et si le saut est possible
        if (player.body.touching.down || jumpCount < 2) { // Deuxième 'if': Vérifie si le joueur est au sol ou si le double saut est autorisé
            player.setVelocityY(-350); // Applique une vitesse verticale pour faire sauter le joueur
            jumpCount++; // Incrémente le compteur de sauts
            canJump = false; // Empêche les sauts répétés tant que la touche est enfoncée
            console.log(jumpCount);
        }
    }

    // Réinitialiser la capacité à sauter lorsque la touche de saut est relâchée
    if (cursors.up.isUp) {
        canJump = true;
    }

    // Gérer la descente rapide
    if (cursors.down.isDown) {
        player.setVelocityY(350); // Accélère la descente du joueur
    }
}
